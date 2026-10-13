"""Temporary Journal rules: limit, expiry, early end, validation."""
import unittest
from datetime import timedelta

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models.github_stats  # noqa: F401  (register tables)
import app.models.journal  # noqa: F401
import app.models.profile  # noqa: F401
from app.models.user import User
from app.services import journal as rules
from app.time import utc_now


class JournalRuleTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        self.db = Session(engine)
        self.user = User(github_id=1, github_username="kushal")
        self.other = User(github_id=2, github_username="rover")
        self.db.add_all([self.user, self.other])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_genre_is_optional(self):
        entry = rules.create_entry(self.db, self.user, "shipped the thing", None)
        self.assertIsNone(entry.genre)

    def test_unknown_genre_rejected(self):
        with self.assertRaises(rules.JournalError):
            rules.create_entry(self.db, self.user, "hi", "nonsense")

    def test_empty_and_overlong_rejected(self):
        for bad in ("", "   \n ", "x" * (rules.MAX_BODY + 1)):
            with self.assertRaises(rules.JournalError):
                rules.create_entry(self.db, self.user, bad, None)

    def test_control_characters_stripped_and_newlines_collapsed(self):
        self.assertEqual(rules.clean_body("a\x00b\n\n\n\n\nc"), "ab\n\nc")

    def test_third_active_entry_is_blocked(self):
        rules.create_entry(self.db, self.user, "one", None)
        rules.create_entry(self.db, self.user, "two", "life")
        with self.assertRaises(rules.JournalError):
            rules.create_entry(self.db, self.user, "three", None)

    def test_limit_is_per_user(self):
        rules.create_entry(self.db, self.user, "one", None)
        rules.create_entry(self.db, self.user, "two", None)
        rules.create_entry(self.db, self.other, "mine", None)  # must not raise

    def test_ending_an_entry_frees_a_slot_immediately(self):
        first = rules.create_entry(self.db, self.user, "one", None)
        rules.create_entry(self.db, self.user, "two", None)
        rules.end_entry(self.db, first)
        rules.create_entry(self.db, self.user, "three", None)  # slot is free again
        self.assertEqual(len(rules.active_entries(self.db, self.user.id)), 2)

    def test_expired_entry_is_inactive_and_frees_a_slot(self):
        old = rules.create_entry(self.db, self.user, "old", None)
        rules.create_entry(self.db, self.user, "two", None)
        old.expires_at = utc_now() - timedelta(seconds=1)
        self.db.add(old)
        self.db.commit()
        self.assertEqual(len(rules.active_entries(self.db, self.user.id)), 1)
        rules.create_entry(self.db, self.user, "three", None)

    def test_entry_lives_24_hours(self):
        entry = rules.create_entry(self.db, self.user, "x", None)
        life = entry.expires_at - entry.created_at
        self.assertEqual(life, timedelta(hours=24))

    def test_ending_is_idempotent(self):
        entry = rules.create_entry(self.db, self.user, "x", None)
        rules.end_entry(self.db, entry)
        first = entry.ended_at
        rules.end_entry(self.db, entry)
        self.assertEqual(entry.ended_at, first)

    def test_old_rows_are_purged_on_post(self):
        stale = rules.create_entry(self.db, self.user, "stale", None)
        stale.created_at = utc_now() - timedelta(days=rules.RETENTION_DAYS + 1)
        stale.expires_at = stale.created_at + rules.LIFETIME
        self.db.add(stale)
        self.db.commit()
        stale_id = stale.id
        rules.create_entry(self.db, self.user, "fresh", None)
        self.db.expire_all()
        self.assertIsNone(self.db.get(rules.JournalEntry, stale_id))


if __name__ == "__main__":
    unittest.main()
