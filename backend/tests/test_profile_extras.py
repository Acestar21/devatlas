"""Profile payload: currently-into, journal, external contributions and their visibility rules."""
import json
import unittest

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models.github_stats  # noqa: F401
import app.models.journal  # noqa: F401
import app.models.profile  # noqa: F401
from app.auth.dependencies import get_current_user_optional, require_current_user
from app.database import get_session
from app.main import app
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.models.user import User
from app.rate_limit import limiter
from app.services import journal as rules

EXTERNAL = [{"repo": "psf/requests", "url": "https://github.com/psf/requests", "owner": "psf",
             "is_org": True, "stars": 5, "commits": 3, "pull_requests": 1, "issues": 0, "reviews": 2}]


class ProfileExtrasTests(unittest.TestCase):
    def setUp(self):
        limiter.enabled = False
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        self.db = Session(engine)
        self.user = User(github_id=1, github_username="kushal")
        self.db.add(self.user)
        self.db.commit()
        self.db.add(Profile(user_id=self.user.id, currently_json=json.dumps([{"text": "Rust", "kind": "tech"}])))
        self.db.add(GithubStatsCache(user_id=self.user.id, external_json=json.dumps(EXTERNAL)))
        self.db.commit()
        rules.create_entry(self.db, self.user, "learning lifetimes", "learning")
        self.viewer = None
        app.dependency_overrides[get_session] = lambda: self.db
        app.dependency_overrides[get_current_user_optional] = lambda: self.viewer
        app.dependency_overrides[require_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        limiter.enabled = True
        self.db.close()

    def profile(self):
        return self.client.get("/profiles/kushal").json()

    def test_visitor_sees_everything_by_default(self):
        data = self.profile()
        self.assertEqual(data["currently"], [{"text": "Rust", "kind": "tech"}])
        self.assertEqual(data["journal"][0]["body"], "learning lifetimes")
        self.assertEqual(data["stats"]["external"][0]["repo"], "psf/requests")

    def test_hidden_external_card_is_stripped_for_visitors_but_kept_for_owner(self):
        self.client.patch("/profiles/me", json={"card_visibility": {"github": {"external": False}}})
        self.assertEqual(self.profile()["stats"]["external"], [])
        self.viewer = self.user
        self.assertEqual(self.profile()["stats"]["external"][0]["repo"], "psf/requests")

    def test_hidden_currently_card_is_stripped_for_visitors(self):
        self.client.patch("/profiles/me", json={"card_visibility": {"activity": {"currently": False}}})
        self.assertEqual(self.profile()["currently"], [])
        self.viewer = self.user
        self.assertEqual(len(self.profile()["currently"]), 1)

    def test_currently_validation(self):
        ok = self.client.patch("/profiles/me", json={"currently": [{"text": "  Elden   Ring ", "kind": "game"}]})
        self.assertEqual(ok.status_code, 200)
        self.viewer = self.user
        self.assertEqual(self.profile()["currently"], [{"text": "Elden Ring", "kind": "game"}])
        self.assertEqual(self.client.patch("/profiles/me", json={"currently": [{"text": "x" * 41}]}).status_code, 422)
        self.assertEqual(self.client.patch("/profiles/me", json={"currently": [{"text": "a", "kind": "zzz"}]}).status_code, 422)
        too_many = [{"text": str(i)} for i in range(7)]
        self.assertEqual(self.client.patch("/profiles/me", json={"currently": too_many}).status_code, 400)

    def test_ended_journal_entry_disappears_from_profile(self):
        entry_id = self.profile()["journal"][0]["id"]
        self.client.delete(f"/journal/{entry_id}")
        self.assertEqual(self.profile()["journal"], [])


if __name__ == "__main__":
    unittest.main()


class InputLimitTests(ProfileExtrasTests):
    """Audit item: bound what PATCH /profiles/me accepts."""

    def test_unknown_theme_and_long_bio_rejected(self):
        self.assertEqual(self.client.patch("/profiles/me", json={"theme": "<script>"}).status_code, 422)
        self.assertEqual(self.client.patch("/profiles/me", json={"theme": "coffee"}).status_code, 200)
        self.assertEqual(self.client.patch("/profiles/me", json={"bio": "x" * 501}).status_code, 422)

    def test_link_label_and_count_limits(self):
        link = {"label": "Blog", "url": "https://example.com"}
        self.assertEqual(self.client.patch("/profiles/me", json={"content_links": [{**link, "label": "x" * 31}]}).status_code, 422)
        self.assertEqual(self.client.patch("/profiles/me", json={"content_links": [link] * 14}).status_code, 422)
        self.assertEqual(self.client.patch("/profiles/me", json={"content_links": [link] * 13}).status_code, 200)
