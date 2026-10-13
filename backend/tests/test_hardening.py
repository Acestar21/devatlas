"""Fix-guide steps 6, 8, 11, 12, 21: failures degrade instead of 500, throttled/limited input,
cheap viewer summary, stats refreshed after the response, reserved usernames."""
import unittest
from datetime import timedelta
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import app.models.github_stats  # noqa: F401
import app.models.profile  # noqa: F401
from app.auth.dependencies import get_current_user_optional, require_current_user, require_internal_secret
from app.database import get_session
from app.main import app
from app.models.github_stats import GithubStatsCache
from app.models.user import User
from app.rate_limit import limiter
from app.services import github as gh
from app.time import utc_now


def make_engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    return engine


class FakeResponse:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}

    def json(self):
        return self._payload


def fake_client(post=None, get=None):
    """Stand-in for httpx.AsyncClient used by the OAuth exchange."""
    class Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k):
            if isinstance(post, Exception): raise post
            return post
        async def get(self, *a, **k):
            if isinstance(get, Exception): raise get
            return get
    return Client


class BaseApi(unittest.TestCase):
    def setUp(self):
        limiter.enabled = False
        self.engine = make_engine()
        self.db = Session(self.engine)
        self.user = User(github_id=1, github_username="kushal")
        self.db.add(self.user)
        self.db.commit()
        self.viewer = None
        app.dependency_overrides[get_session] = lambda: self.db
        app.dependency_overrides[get_current_user_optional] = lambda: self.viewer
        app.dependency_overrides[require_current_user] = lambda: self.user
        app.dependency_overrides[require_internal_secret] = lambda: None
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        limiter.enabled = True
        self.db.close()


class ExchangeFailureTests(BaseApi):
    def exchange(self):
        with patch("app.routers.auth._state_is_valid", return_value=True):
            return self.client.post("/auth/github/internal/exchange", params={"code": "c", "state": "s"})

    def test_github_timeout_is_a_502_not_a_500(self):
        with patch("app.routers.auth.httpx.AsyncClient", fake_client(post=httpx.ConnectTimeout("slow"))):
            response = self.exchange()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "github_unreachable")

    def test_failed_user_lookup_is_handled(self):
        token = FakeResponse(200, {"access_token": "t"})
        with patch("app.routers.auth.httpx.AsyncClient", fake_client(post=token, get=FakeResponse(500, {"message": "x"}))):
            response = self.exchange()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "github_failed")

    def test_user_payload_without_id_is_handled(self):
        token = FakeResponse(200, {"access_token": "t"})
        with patch("app.routers.auth.httpx.AsyncClient", fake_client(post=token, get=FakeResponse(200, {"message": "oops"}))):
            response = self.exchange()
        self.assertEqual(response.status_code, 502)

    def test_reserved_username_cannot_sign_up(self):
        token = FakeResponse(200, {"access_token": "t"})
        profile = FakeResponse(200, {"id": 99, "login": "Directory", "created_at": "2015-01-01T00:00:00Z"})
        with patch("app.routers.auth.httpx.AsyncClient", fake_client(post=token, get=profile)):
            response = self.exchange()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"]["code"], "reserved_username")


class GithubFetchFailureTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = make_engine()
        self.db = Session(self.engine)
        self.user = User(github_id=1, github_username="kushal", encrypted_github_token="not-a-valid-fernet-token")
        self.db.add(self.user)
        self.db.commit()

    async def test_rotated_key_degrades_instead_of_crashing(self):
        with self.assertRaises(gh.GithubTokenInvalid):
            await gh.fetch_and_cache_stats(self.user, self.db)

    async def test_missing_token_degrades(self):
        self.user.encrypted_github_token = None
        with self.assertRaises(gh.GithubTokenInvalid):
            await gh.fetch_and_cache_stats(self.user, self.db)

    async def test_failed_background_refresh_backs_off(self):
        old = utc_now() - timedelta(days=2)
        self.db.add(GithubStatsCache(user_id=self.user.id, last_fetched_at=old))
        self.db.commit()
        await gh.refresh_stats_in_background(self.user.id, db_engine=self.engine)
        self.db.expire_all()
        cache = self.db.exec(select(GithubStatsCache)).first()
        self.assertFalse(gh.is_stale(cache))  # timestamp bumped: no retry storm


class ProfileServingTests(BaseApi):
    def test_stale_cache_is_served_immediately_and_refreshed_after(self):
        self.db.add(GithubStatsCache(user_id=self.user.id, total_contributions=42,
                                     last_fetched_at=utc_now() - timedelta(days=2)))
        self.db.commit()
        with patch("app.routers.profiles.refresh_stats_in_background") as refresh:
            response = self.client.get("/profiles/kushal")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["stats"]["total_contributions"], 42)
        refresh.assert_called_once_with(self.user.id)

    def test_fresh_cache_does_not_refresh(self):
        self.db.add(GithubStatsCache(user_id=self.user.id, last_fetched_at=utc_now()))
        self.db.commit()
        with patch("app.routers.profiles.refresh_stats_in_background") as refresh:
            self.client.get("/profiles/kushal")
        refresh.assert_not_called()

    def test_summary_is_tiny_and_never_touches_github(self):
        with patch("app.routers.profiles.refresh_stats_in_background") as refresh:
            data = self.client.get("/profiles/me/summary").json()
        self.assertEqual(set(data), {"username", "avatar_url", "viewer_role"})
        self.assertEqual(data["username"], "kushal")
        refresh.assert_not_called()


class TagInputTests(BaseApi):
    def test_overlong_tag_name_and_search_rejected(self):
        self.assertEqual(self.client.post("/tags", params={"name": "x" * 51, "category": "stack"}).status_code, 422)
        self.assertEqual(self.client.get("/tags", params={"category": "stack", "search": "x" * 51}).status_code, 422)


if __name__ == "__main__":
    unittest.main()


class UniqueLinkTests(BaseApi):
    """Step 18: the database, not just a check-then-insert, stops duplicate tag links."""

    def setUp(self):
        super().setUp()
        from app.models.tag import Tag
        self.tag = Tag(name="Python", category="stack", status="approved")
        self.db.add(self.tag)
        self.db.commit()

    def test_database_rejects_a_duplicate_link(self):
        from sqlalchemy.exc import IntegrityError
        from app.models.tags_relations import StackTag
        self.db.add(StackTag(user_id=self.user.id, tag_id=self.tag.id))
        self.db.commit()
        self.db.add(StackTag(user_id=self.user.id, tag_id=self.tag.id))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_a_lost_race_returns_already_added_not_a_500(self):
        from sqlalchemy.exc import IntegrityError
        with patch.object(self.db, "commit", side_effect=IntegrityError("x", {}, Exception())):
            response = self.client.post(f"/profiles/me/stack/{self.tag.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Already added")

    def test_normal_add_twice_is_idempotent(self):
        self.assertEqual(self.client.post(f"/profiles/me/stack/{self.tag.id}").json()["message"], "Stack tag added")
        self.assertEqual(self.client.post(f"/profiles/me/stack/{self.tag.id}").json()["message"], "Already added")
