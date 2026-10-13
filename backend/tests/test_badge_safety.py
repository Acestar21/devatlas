"""The badge is an image: escape everything, send safe headers, and respect hidden GitHub sections."""
import json
import unittest

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models.github_stats  # noqa: F401
import app.models.profile  # noqa: F401
from app.database import get_session
from app.main import app
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.models.user import User
from app.rate_limit import limiter


class BadgeSafetyTests(unittest.TestCase):
    def setUp(self):
        limiter.enabled = False
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        self.db = Session(engine)
        self.user = User(github_id=1, github_username="kushal")
        self.db.add(self.user)
        self.db.commit()
        self.db.add(GithubStatsCache(user_id=self.user.id, total_contributions=7,
                                     top_languages_json=json.dumps(["<script>alert(1)</script>"])))
        self.db.commit()
        app.dependency_overrides[get_session] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        limiter.enabled = True
        self.db.close()

    def test_language_names_are_escaped_and_headers_set(self):
        response = self.client.get("/badge/kushal")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("<script>", response.text)
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertIn("default-src 'none'", response.headers["content-security-policy"])

    def test_unknown_user_is_escaped(self):
        response = self.client.get("/badge/<svg onload=alert(1)>")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("<svg onload", response.text)

    def test_hidden_github_section_hides_the_badge(self):
        self.db.add(Profile(user_id=self.user.id, section_visibility_json=json.dumps({"github": False})))
        self.db.commit()
        self.assertEqual(self.client.get("/badge/kushal").status_code, 404)


if __name__ == "__main__":
    unittest.main()
