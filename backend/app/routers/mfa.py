"""MFA routes for staff. Deliberately NOT under /mod (those require an elevated session).

Routes that return a session token (enroll, verify, lock) require the internal secret, so only our
own Next.js route /api/mfa/[action] can call them; it strips the token from the JSON and sets it as
an httpOnly cookie. The browser never sees the token.
"""
import json
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from app.auth.crypto import decrypt_token, encrypt_token
from app.auth.dependencies import require_internal_secret, require_moderator, require_staff
from app.auth.mfa import (
    ELEVATION_SECONDS,
    LOCKOUT_MINUTES,
    MAX_FAILED_ATTEMPTS,
    consume_recovery_code,
    elevated_until,
    generate_recovery_codes,
    get_mfa,
    is_enrolled,
    matching_step,
    new_secret,
    normalize_code,
    provisioning_uri,
    recovery_codes_left,
)
from app.auth.session import create_session_token
from app.database import get_session
from app.models.staff_mfa import StaffMfa
from app.models.user import User
from app.moderation import effective_role, record
from app.services.notify import notify_staff

router = APIRouter(prefix="/mfa", tags=["mfa"])


class EnrollBody(BaseModel):
    code: str


class VerifyBody(BaseModel):
    code: str | None = None
    recovery_code: str | None = None


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


def _elevation_response(user: User) -> dict:
    now = int(time.time())
    return {
        "session_token": create_session_token(user.id, mfa_at=now),
        "elevated_until": _iso(datetime.utcfromtimestamp(now + ELEVATION_SECONDS)),
    }


@router.get("/status")
def mfa_status(request: Request, user: User = Depends(require_staff), db: Session = Depends(get_session)):
    mfa = get_mfa(db, user.id)
    until = elevated_until(getattr(request.state, "mfa_at", None), mfa)
    locked = mfa.locked_until if (mfa and mfa.locked_until and mfa.locked_until > datetime.utcnow()) else None
    return {
        "username": user.github_username,
        "role": effective_role(user),
        "enrolled": is_enrolled(mfa),
        "elevated": until is not None,
        "elevated_until": _iso(until),
        "locked_until": _iso(locked),
        "recovery_codes_left": recovery_codes_left(mfa),
    }


@router.post("/setup")
def mfa_setup(user: User = Depends(require_staff), db: Session = Depends(get_session)):
    """Step 1 of enrolment. Reuses the pending secret if there is one, so a refresh or a second
    click can't leave your authenticator holding a different secret than the server."""
    mfa = get_mfa(db, user.id)
    if is_enrolled(mfa):
        raise HTTPException(status_code=400, detail="MFA is already set up. Ask an admin to reset it if you lost your device.")
    if mfa is None:
        mfa = StaffMfa(user_id=user.id)
    if mfa.pending_secret_encrypted:
        secret = decrypt_token(mfa.pending_secret_encrypted)
    else:
        secret = new_secret()
        mfa.pending_secret_encrypted = encrypt_token(secret)  # Fernet helper from auth/crypto.py; the name says "token" but it's generic
        db.add(mfa)
        db.commit()
    return {"secret": secret, "otpauth_uri": provisioning_uri(secret, user.github_username)}


@router.post("/enroll", dependencies=[Depends(require_internal_secret)])
def mfa_enroll(
    body: EnrollBody,
    background: BackgroundTasks,
    user: User = Depends(require_staff),
    db: Session = Depends(get_session),
):
    """Step 2: confirm a code from the authenticator, activate MFA, return recovery codes once."""
    mfa = get_mfa(db, user.id)
    if is_enrolled(mfa):
        raise HTTPException(status_code=400, detail="MFA is already set up.")
    if mfa is None or not mfa.pending_secret_encrypted:
        raise HTTPException(status_code=400, detail="Start the setup first.")

    step = matching_step(decrypt_token(mfa.pending_secret_encrypted), normalize_code(body.code))
    if step is None:
        raise HTTPException(status_code=400, detail="That code didn't match. Check your authenticator and try again.")

    plain, hashes = generate_recovery_codes()
    mfa.secret_encrypted = mfa.pending_secret_encrypted
    mfa.pending_secret_encrypted = None
    mfa.enrolled_at = datetime.utcnow()
    mfa.last_step = step
    mfa.failed_attempts = 0
    mfa.locked_until = None
    mfa.recovery_hashes_json = json.dumps(hashes)
    db.add(mfa)
    record(db, user, "mfa_enroll")
    db.commit()

    # The admin's defence against "someone enrolled a mod's hijacked GitHub account": a human checks.
    background.add_task(notify_staff, f"MFA enrolled by @{user.github_username}. If that wasn't expected, an admin should reset it.")
    return {"recovery_codes": plain, **_elevation_response(user)}


@router.post("/verify", dependencies=[Depends(require_internal_secret)])
def mfa_verify(
    body: VerifyBody,
    background: BackgroundTasks,
    user: User = Depends(require_staff),
    db: Session = Depends(get_session),
):
    """Start an elevated session with an authenticator code or a one-time recovery code."""
    mfa = get_mfa(db, user.id)
    if not is_enrolled(mfa):
        raise HTTPException(status_code=400, detail="Set up MFA first.")

    now = datetime.utcnow()
    if mfa.locked_until and mfa.locked_until > now:
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again after {mfa.locked_until:%H:%M} UTC.")

    ok = False
    used_recovery = False
    if body.recovery_code:
        ok = used_recovery = consume_recovery_code(mfa, body.recovery_code)
    elif body.code:
        step = matching_step(decrypt_token(mfa.secret_encrypted), normalize_code(body.code))
        if step is not None and step > mfa.last_step:  # a step can only be used once (replay protection)
            mfa.last_step = step
            ok = True

    if not ok:
        mfa.failed_attempts += 1
        message = "Invalid code."
        if mfa.failed_attempts >= MAX_FAILED_ATTEMPTS:
            mfa.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            mfa.failed_attempts = 0
            record(db, user, "mfa_lockout")
            background.add_task(notify_staff, f"MFA lockout for @{user.github_username} after repeated failed codes.")
            message = f"Too many attempts. Locked for {LOCKOUT_MINUTES} minutes."
        db.add(mfa)
        db.commit()  # persist the counter BEFORE raising
        raise HTTPException(status_code=400, detail=message)

    mfa.failed_attempts = 0
    mfa.locked_until = None
    db.add(mfa)
    record(db, user, "mfa_recovery_used" if used_recovery else "mfa_verify")
    db.commit()
    if used_recovery:
        background.add_task(
            notify_staff,
            f"@{user.github_username} signed in with a recovery code ({recovery_codes_left(mfa)} left).",
        )
    return _elevation_response(user)


@router.post("/lock", dependencies=[Depends(require_internal_secret)])
def mfa_lock(user: User = Depends(require_staff), db: Session = Depends(get_session)):
    """End your own elevated session now: re-issue a normal token without mfa_at."""
    record(db, user, "mfa_lock")
    db.commit()
    return {"session_token": create_session_token(user.id)}


@router.post("/recovery-codes")
def regenerate_recovery_codes(user: User = Depends(require_moderator), db: Session = Depends(get_session)):
    """New set of recovery codes (old ones stop working). Requires an elevated session."""
    mfa = get_mfa(db, user.id)
    plain, hashes = generate_recovery_codes()
    mfa.recovery_hashes_json = json.dumps(hashes)
    db.add(mfa)
    record(db, user, "mfa_recovery_regen")
    db.commit()
    return {"recovery_codes": plain}