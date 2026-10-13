"""Journal HTTP behaviour: limit, ownership, public feed filtering."""
import unittest
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models.github_stats  # noqa: F401
import app.models.journal  # noqa: F401
import app.models.profile  # noqa: F401
from app.auth.dependencies import require_current_user
from app.database import get_session
from app.main import app
from app.models.journal import JournalEntry
from app.models.user import User
from app.rate_limit import limiter
from app.time import utc_now


class JournalApiTests(unittest.TestCase):
    def setUp(self):
        limiter.enabled = False
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        self.db = Session(engine)
        self.me = User(github_id=1, github_username="me")
        self.you = User(github_id=2, github_username="you")
        self.mod = User(github_id=3, github_username="mod", role="moderator")
        self.db.add_all([self.me, self.you, self.mod])
        self.db.commit()
        self.current = self.me
        app.dependency_overrides[get_session] = lambda: self.db
        app.dependency_overrides[require_current_user] = lambda: self.current
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        limiter.enabled = True
        self.db.close()

    def post(self, body="hello", **extra):
        return self.client.post("/journal", json={"body": body, **extra})

    def test_post_without_genre_then_limit_then_free_a_slot(self):
        first = self.post("one")
        self.assertEqual(first.status_code, 201)
        self.assertIsNone(first.json()["genre"])
        self.assertEqual(self.post("two", genre="life").status_code, 201)
        blocked = self.post("three")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(self.client.delete(f"/journal/{first.json()['id']}").status_code, 204)
        self.assertEqual(self.post("three").status_code, 201)

    def test_bad_genre_and_empty_body_rejected(self):
        self.assertEqual(self.post("x", genre="bogus").status_code, 422)
        self.assertEqual(self.post("   ").status_code, 400)

    def test_cannot_end_someone_elses_entry(self):
        entry_id = self.post("mine").json()["id"]
        self.current = self.you
        self.assertEqual(self.client.delete(f"/journal/{entry_id}").status_code, 404)

    def test_moderator_can_remove_and_it_is_audited(self):
        entry_id = self.post("rude").json()["id"]
        self.current = self.mod
        self.assertEqual(self.client.delete(f"/journal/{entry_id}").status_code, 204)
        from app.models.moderation import ModerationLog
        from sqlmodel import select
        log = self.db.exec(select(ModerationLog)).all()
        self.assertEqual([entry.action for entry in log], ["journal_remove"])
        self.assertEqual(self.client.get("/journal").json()["total"], 0)

    def test_feed_hides_expired_ended_and_suspended(self):
        live = self.post("live").json()["id"]
        ended = self.post("ended").json()["id"]
        self.client.delete(f"/journal/{ended}")
        self.db.add(JournalEntry(
            user_id=self.you.id, body="expired",
            created_at=utc_now() - timedelta(hours=25), expires_at=utc_now() - timedelta(hours=1)))
        self.db.commit()
        feed = self.client.get("/journal").json()
        self.assertEqual([row["id"] for row in feed["results"]], [live])
        self.assertEqual(feed["results"][0]["username"], "me")

        self.me.suspended = True
        self.db.add(self.me)
        self.db.commit()
        self.assertEqual(self.client.get("/journal").json()["total"], 0)

    def test_genre_filter(self):
        self.post("a", genre="gaming")
        self.post("b", genre="life")
        feed = self.client.get("/journal", params={"genre": "gaming"}).json()
        self.assertEqual([row["body"] for row in feed["results"]], ["a"])

    def test_suspended_user_cannot_post(self):
        self.me.suspended = True
        self.db.add(self.me)
        self.db.commit()
        self.assertEqual(self.post("hi").status_code, 403)


if __name__ == "__main__":
    unittest.main()
