"""Second factor for staff (TOTP) and the 'elevated session' rule.

HOW ELEVATION WORKS
  1. Staff sign in with GitHub as usual -> normal session cookie.
  2. At /mod/mfa they enter an authenticator code (or a recovery code).
  3. The backend re-issues the session token with an `mfa_at` timestamp (routers/mfa.py).
  4. require_moderator (auth/dependencies.py) lets a request through only if the role is staff AND
     mfa_at is < ELEVATION_SECONDS old AND it wasn't revoked. Role is re-read from the DB on every
     request, so demoting someone takes effect immediately.
  Logging in again with GitHub issues a token WITHOUT mfa_at, so elevation never survives a re-login.
"""
import hashlib
import hmac
import json
import re
import secrets
import time
from datetime import datetime, timedelta, timezone

import pyotp
from sqlmodel import Session, select

from app.models.staff_mfa import StaffMfa
from app.time import as_utc, utc_now

ELEVATION_SECONDS = 30 * 60
TOTP_INTERVAL = 30
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
RECOVERY_CODE_COUNT = 8
ISSUER = "DevAtlas"
_RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no look-alike characters


def get_mfa(db: Session, user_id: int) -> StaffMfa | None:
    return db.exec(select(StaffMfa).where(StaffMfa.user_id == user_id)).first()


def is_enrolled(mfa: StaffMfa | None) -> bool:
    return bool(mfa and mfa.secret_encrypted)


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret, interval=TOTP_INTERVAL).provisioning_uri(name=username, issuer_name=ISSUER)


def normalize_code(raw: str | None) -> str:
    return re.sub(r"[\s-]", "", raw or "").upper()


def matching_step(secret: str, code: str) -> int | None:
    """The TOTP time step this code belongs to (current step +/- 1 for clock drift), or None."""
    if not re.fullmatch(r"\d{6}", code):
        return None
    totp = pyotp.TOTP(secret, interval=TOTP_INTERVAL)
    current = int(time.time()) // TOTP_INTERVAL
    for step in (current - 1, current, current + 1):
        if hmac.compare_digest(totp.at(step * TOTP_INTERVAL), code):
            return step
    return None


def _hash_recovery(code: str) -> str:
    return hashlib.sha256(normalize_code(code).encode()).hexdigest()


def generate_recovery_codes() -> tuple[list[str], list[str]]:
    """(plain codes, shown to the user exactly once; hashes to store)."""
    plain = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = "".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(10))
        plain.append(f"{raw[:5]}-{raw[5:]}")
    return plain, [_hash_recovery(c) for c in plain]


def consume_recovery_code(mfa: StaffMfa, code: str) -> bool:
    """True and burns the code if it matches an unused one. Caller commits."""
    hashes: list[str] = json.loads(mfa.recovery_hashes_json)
    candidate = _hash_recovery(code)
    for stored in hashes:
        if hmac.compare_digest(stored, candidate):
            hashes.remove(stored)
            mfa.recovery_hashes_json = json.dumps(hashes)
            return True
    return False


def recovery_codes_left(mfa: StaffMfa | None) -> int:
    return len(json.loads(mfa.recovery_hashes_json)) if is_enrolled(mfa) else 0


def elevated_until(mfa_at: int | None, mfa: StaffMfa | None) -> datetime | None:
    """When the current elevated session ends (aware UTC), or None if not elevated."""
    if mfa_at is None or not is_enrolled(mfa):
        return None
    issued = datetime.fromtimestamp(mfa_at, timezone.utc)
    if mfa.elevation_revoked_at and issued <= as_utc(mfa.elevation_revoked_at):
        return None
    expires = issued + timedelta(seconds=ELEVATION_SECONDS)
    return expires if expires > utc_now() else None