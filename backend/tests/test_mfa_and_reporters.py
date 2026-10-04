import time
import unittest
from datetime import datetime, timedelta

import pyotp

from app.auth import mfa as mfa_lib
from app.models.moderation import Report
from app.models.staff_mfa import StaffMfa
from app.models.user import User
from app.routers.mod import _reporter_info


def enrolled_mfa(**overrides) -> StaffMfa:
    fields = {"user_id": 1, "secret_encrypted": "x", "enrolled_at": datetime.utcnow()}
    fields.update(overrides)
    return StaffMfa(**fields)


class TotpTests(unittest.TestCase):
    def test_current_code_matches(self):
        secret = pyotp.random_base32()
        self.assertIsNotNone(mfa_lib.matching_step(secret, pyotp.TOTP(secret).now()))

    def test_wrong_code_does_not_match(self):
        secret = pyotp.random_base32()
        wrong = "000000" if pyotp.TOTP(secret).now() != "000000" else "111111"
        self.assertIsNone(mfa_lib.matching_step(secret, wrong))

    def test_malformed_codes_are_rejected(self):
        secret = pyotp.random_base32()
        for bad in ("", "12345", "abcdef", "1234567"):
            self.assertIsNone(mfa_lib.matching_step(secret, bad))


class RecoveryCodeTests(unittest.TestCase):
    def test_each_code_works_once(self):
        plain, hashes = mfa_lib.generate_recovery_codes()
        row = enrolled_mfa(recovery_hashes_json=__import__("json").dumps(hashes))
        self.assertTrue(mfa_lib.consume_recovery_code(row, plain[0]))
        self.assertFalse(mfa_lib.consume_recovery_code(row, plain[0]))
        self.assertEqual(mfa_lib.recovery_codes_left(row), len(plain) - 1)

    def test_case_and_dash_insensitive(self):
        plain, hashes = mfa_lib.generate_recovery_codes()
        row = enrolled_mfa(recovery_hashes_json=__import__("json").dumps(hashes))
        self.assertTrue(mfa_lib.consume_recovery_code(row, plain[1].lower().replace("-", " ")))

    def test_unknown_code_rejected(self):
        _, hashes = mfa_lib.generate_recovery_codes()
        row = enrolled_mfa(recovery_hashes_json=__import__("json").dumps(hashes))
        self.assertFalse(mfa_lib.consume_recovery_code(row, "AAAAA-AAAAA"))


class ElevationTests(unittest.TestCase):
    def test_not_elevated_without_token_claim_or_enrolment(self):
        self.assertIsNone(mfa_lib.elevated_until(None, enrolled_mfa()))
        self.assertIsNone(mfa_lib.elevated_until(int(time.time()), None))
        self.assertIsNone(mfa_lib.elevated_until(int(time.time()), StaffMfa(user_id=1)))  # not enrolled

    def test_fresh_claim_is_elevated(self):
        self.assertIsNotNone(mfa_lib.elevated_until(int(time.time()), enrolled_mfa()))

    def test_expired_claim_is_not(self):
        old = int(time.time()) - mfa_lib.ELEVATION_SECONDS - 5
        self.assertIsNone(mfa_lib.elevated_until(old, enrolled_mfa()))

    def test_revoked_claim_is_not(self):
        issued = int(time.time()) - 60
        row = enrolled_mfa(elevation_revoked_at=datetime.utcnow())
        self.assertIsNone(mfa_lib.elevated_until(issued, row))


class ReporterInfoTests(unittest.TestCase):
    def setUp(self):
        self.history = {42: {"total": 3, "dismissed": 2}}

    def test_active(self):
        current = User(id=7, github_id=42, github_username="rep")
        report = Report(reporter_user_id=7, reporter_github_id=42, reporter_username="rep", target_user_id=1, category="spam")
        info = _reporter_info(report, {42: current}, self.history)
        self.assertEqual(info["state"], "active")
        self.assertEqual(info["dismissed"], 2)

    def test_deleted_keeps_name(self):
        report = Report(reporter_user_id=None, reporter_github_id=42, reporter_username="rep", target_user_id=1, category="spam")
        info = _reporter_info(report, {}, self.history)
        self.assertEqual((info["state"], info["username"]), ("deleted", "rep"))

    def test_reregistered_is_flagged_and_linked_to_new_account(self):
        current = User(id=9, github_id=42, github_username="rep")
        report = Report(reporter_user_id=None, reporter_github_id=42, reporter_username="rep", target_user_id=1, category="spam")
        info = _reporter_info(report, {42: current}, self.history)
        self.assertEqual((info["state"], info["account_id"]), ("re-registered", 9))

    def test_purged(self):
        report = Report(reporter_user_id=None, reporter_github_id=None, reporter_username=None, target_user_id=1, category="spam")
        self.assertEqual(_reporter_info(report, {}, {})["state"], "purged")