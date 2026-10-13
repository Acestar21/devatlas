"""Pre-launch fix list: games/IGDB artwork, X-Forwarded-For hops, case-insensitive usernames,
pending-tag cap, refresh in-flight guard, input caps."""
import json
import unittest
from datetime import timedelta
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select
from starlette.requests import Request

import app.models.github_stats  # noqa: F401
import app.models.journal  # noqa: F401
import app.models.profile  # noqa: F401
from app import rate_limit
from app.auth.dependencies import get_current_user_optional, require_current_user
from app.database import get_session
from app.main import app
from app.models.github_stats import GithubStatsCache
from app.models.tag import Tag
from app.models.user import User
from app.rate_limit import limiter
from app.schemas.profile import ContentLink, Game, Post
from app.services import github as gh
from app.time import utc_now


def make_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    return engine, Session(engine)


class Base(unittest.TestCase):
    def setUp(self):
        limiter.enabled = False
        self.engine, self.db = make_session()
        self.user = User(github_id=1, github_username="Acestar21")
        self.db.add(self.user)
        self.db.commit()
        app.dependency_overrides[get_session] = lambda: self.db
        app.dependency_overrides[get_current_user_optional] = lambda: None
        app.dependency_overrides[require_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        limiter.enabled = True
        self.db.close()


IGDB_GAME = [{
    "id": 7, "name": "Elden Ring",
    "cover": {"image_id": "co4jni"},
    "artworks": [{"image_id": "ar1"+"aaaa"}, {"image_id": "ar2bbbb"}],
    "screenshots": [{"image_id": "sc3cccc"}],
}]


class GameImagesTests(Base):
    def test_every_cover_artwork_and_screenshot_is_offered(self):
        with patch("app.routers.games._igdb_games", AsyncMock(return_value=IGDB_GAME)):
            options = self.client.get("/games/7/images").json()["options"]
        self.assertEqual([o["kind"] for o in options], ["cover", "artwork", "artwork", "screenshot"])
        self.assertTrue(all(o["url"].startswith("https://images.igdb.com/igdb/image/upload/t_") for o in options))
        self.assertIn("t_cover_big", options[0]["url"])
        self.assertIn("t_screenshot_big", options[1]["url"])

    def test_not_configured_or_unknown_game_gives_no_options(self):
        with patch("app.routers.games._igdb_games", AsyncMock(return_value=None)):
            self.assertEqual(self.client.get("/games/7/images").json(), {"options": []})
        with patch("app.routers.games._igdb_games", AsyncMock(return_value=[])):
            self.assertEqual(self.client.get("/games/7/images").json(), {"options": []})

    def test_search_still_returns_a_default_image(self):
        with patch("app.routers.games._igdb_games", AsyncMock(return_value=IGDB_GAME)):
            hits = self.client.get("/games/search", params={"q": "elden"}).json()
        self.assertEqual(hits[0]["igdb_id"], 7)
        self.assertIn("ar1aaaa", hits[0]["art"])


class CoverUrlValidationTests(unittest.TestCase):
    GOOD = "https://images.igdb.com/igdb/image/upload/t_screenshot_big/ar1aaaa.jpg"

    def test_only_real_igdb_image_urls_are_accepted(self):
        self.assertEqual(Game(name="x", cover_url=self.GOOD).cover_url, self.GOOD)
        for bad in (
            "https://evil.com/igdb/image/upload/t_big/abcd.jpg",
            "http://images.igdb.com/igdb/image/upload/t_big/abcd.jpg",
            "https://images.igdb.com/igdb/image/upload/t_big/../../x.jpg",
            "https://images.igdb.com/igdb/image/upload/t_big/abcd.svg",
            "https://images.igdb.com.evil.com/igdb/image/upload/t_big/abcd.jpg",
            "javascript:alert(1)",
        ):
            with self.assertRaises(ValidationError, msg=bad):
                Game(name="x", cover_url=bad)

    def test_link_and_post_urls_are_capped(self):
        long_url = "https://example.com/" + "a" * 500
        with self.assertRaises(ValidationError):
            ContentLink(label="Blog", url=long_url)
        with self.assertRaises(ValidationError):
            Post(title="t", url=long_url)


def fake_request(headers: dict, client=("203.0.113.9", 1234)) -> Request:
    scope = {"type": "http", "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
             "client": client, "method": "GET", "path": "/", "query_string": b""}
    return Request(scope)


class ForwardedForTests(unittest.TestCase):
    def test_default_ignores_a_spoofed_header(self):
        request = fake_request({"X-Forwarded-For": "10.0.0.1"})
        with patch.object(rate_limit.settings, "trusted_proxy_hops", 0):
            self.assertEqual(rate_limit.client_key(request), "203.0.113.9")

    def test_with_one_trusted_hop_only_the_right_most_entry_counts(self):
        # a client sent "10.0.0.1"; our proxy appended the address it really saw
        request = fake_request({"X-Forwarded-For": "10.0.0.1, 198.51.100.7"})
        with patch.object(rate_limit.settings, "trusted_proxy_hops", 1):
            self.assertEqual(rate_limit.client_key(request), "198.51.100.7")

    def test_garbage_or_short_header_falls_back_to_the_socket(self):
        with patch.object(rate_limit.settings, "trusted_proxy_hops", 2):
            self.assertEqual(rate_limit.client_key(fake_request({"X-Forwarded-For": "198.51.100.7"})), "203.0.113.9")
        with patch.object(rate_limit.settings, "trusted_proxy_hops", 1):
            self.assertEqual(rate_limit.client_key(fake_request({"X-Forwarded-For": "not-an-ip"})), "203.0.113.9")


class CaseInsensitiveUsernameTests(Base):
    def test_profile_and_badge_resolve_any_casing(self):
        self.db.add(GithubStatsCache(user_id=self.user.id, last_fetched_at=utc_now()))
        self.db.commit()
        for name in ("Acestar21", "acestar21", "ACESTAR21"):
            self.assertEqual(self.client.get(f"/profiles/{name}").status_code, 200, name)
            self.assertEqual(self.client.get(f"/badge/{name}").status_code, 200, name)
        self.assertEqual(self.client.get("/profiles/nobody").status_code, 404)

    def test_report_target_lookup_is_case_insensitive(self):
        other = User(github_id=2, github_username="Rover")
        self.db.add(other)
        self.db.commit()
        with patch("app.routers.reports.notify_staff", AsyncMock()):
            response = self.client.post("/reports", json={"username": "rover", "category": "spam", "details": ""})
        self.assertNotEqual(response.status_code, 404)


class PendingTagCapTests(Base):
    def test_a_user_cannot_have_more_than_ten_pending_tags(self):
        for i in range(10):
            self.assertEqual(self.client.post("/tags", params={"name": f"Tag{i}", "category": "stack"}).status_code, 200)
        blocked = self.client.post("/tags", params={"name": "OneTooMany", "category": "stack"})
        self.assertEqual(blocked.status_code, 429)

    def test_the_cap_is_per_user(self):
        for i in range(10):
            self.db.add(Tag(name=f"Other{i}", category="stack", status="pending", submitted_by_user_id=999))
        self.db.commit()
        self.assertEqual(self.client.post("/tags", params={"name": "Mine", "category": "stack"}).status_code, 200)


class RefreshGuardTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine, self.db = make_session()
        self.user = User(github_id=1, github_username="kushal")
        self.db.add(self.user)
        self.db.commit()
        self.db.add(GithubStatsCache(user_id=self.user.id, last_fetched_at=utc_now() - timedelta(days=2)))
        self.db.commit()

    async def test_second_refresh_for_the_same_user_is_skipped_while_one_runs(self):
        calls = []

        async def slow_fetch(user, db):
            calls.append(user.id)
            await gh.refresh_stats_in_background(user.id, db_engine=self.engine)  # a concurrent view
            return None

        with patch.object(gh, "fetch_and_cache_stats", slow_fetch):
            await gh.refresh_stats_in_background(self.user.id, db_engine=self.engine)
        self.assertEqual(calls, [self.user.id])
        self.assertNotIn(self.user.id, gh._in_flight)  # released afterwards

    async def test_a_partial_graphql_reply_backs_off_instead_of_retrying_forever(self):
        with patch.object(gh, "fetch_and_cache_stats", AsyncMock(side_effect=KeyError("user"))):
            await gh.refresh_stats_in_background(self.user.id, db_engine=self.engine)
        self.db.expire_all()
        cache = self.db.exec(select(GithubStatsCache)).first()
        self.assertFalse(gh.is_stale(cache))
        self.assertNotIn(self.user.id, gh._in_flight)


if __name__ == "__main__":
    unittest.main()
