import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from app import moderation as mod
from app.config import settings
from app.models.user import User


def make_user(**overrides) -> User:
    fields = {"id": 1, "github_id": 100, "github_username": "someone"}
    fields.update(overrides)
    return User(**fields)


class EffectiveRoleTests(unittest.TestCase):
    def test_anonymous(self):
        self.assertEqual(mod.effective_role(None), "anonymous")

    def test_default_user(self):
        self.assertEqual(mod.effective_role(make_user()), "user")

    def test_stored_moderator(self):
        self.assertEqual(mod.effective_role(make_user(role="moderator")), "moderator")

    def test_env_admin_is_always_admin_even_if_db_says_user(self):
        with patch.object(settings, "admin_github_id", 100):
            self.assertEqual(mod.effective_role(make_user(role="user")), "admin")

    def test_env_admin_id_zero_grants_nothing(self):
        with patch.object(settings, "admin_github_id", 0):
            self.assertEqual(mod.effective_role(make_user(github_id=0)), "user")


class SuspensionTests(unittest.TestCase):
    def test_not_suspended(self):
        self.assertFalse(mod.is_suspended(make_user()))

    def test_suspended_until_lifted(self):
        self.assertTrue(mod.is_suspended(make_user(suspended=True, suspended_until=None)))

    def test_suspended_in_future(self):
        user = make_user(suspended=True, suspended_until=datetime.utcnow() + timedelta(days=1))
        self.assertTrue(mod.is_suspended(user))

    def test_expired_suspension_is_not_active(self):
        user = make_user(suspended=True, suspended_until=datetime.utcnow() - timedelta(seconds=1))
        self.assertFalse(mod.is_suspended(user))


class VisibilityTests(unittest.TestCase):
    def setUp(self):
        self.owner = make_user(id=1, suspended=True)

    def test_public_cannot_see_suspended_profile(self):
        self.assertFalse(mod.can_view_profile(self.owner, None))
        self.assertFalse(mod.can_view_profile(self.owner, make_user(id=2, github_id=200)))

    def test_owner_and_staff_can(self):
        self.assertTrue(mod.can_view_profile(self.owner, self.owner))
        self.assertTrue(mod.can_view_profile(self.owner, make_user(id=3, github_id=300, role="moderator")))

    def test_everyone_sees_normal_profiles(self):
        self.assertTrue(mod.can_view_profile(make_user(), None))


class ModerationInfoTests(unittest.TestCase):
    def test_none_when_not_suspended(self):
        self.assertIsNone(mod.moderation_info(make_user()))

    def test_contains_reason_when_suspended(self):
        info = mod.moderation_info(make_user(suspended=True, suspension_reason="inappropriate image"))
        self.assertEqual(info["reason"], "inappropriate image")
        self.assertIsNone(info["until"])