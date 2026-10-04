from itsdangerous import URLSafeTimedSerializer, BadSignature
from app.config import settings

SESSION_COOKIE_NAME = "devcard_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14  # 14 days

_serializer = URLSafeTimedSerializer(settings.secret_key, salt="devcard-session")


def create_session_token(user_id: int, mfa_at: int | None = None) -> str:
    """Produces a signed, tamper-proof string. `mfa_at` (unix seconds) marks an MFA-elevated
    session; see app/auth/mfa.py. Safe to put directly in a cookie value."""
    payload: dict = {"user_id": user_id}
    if mfa_at is not None:
        payload["mfa_at"] = mfa_at
    return _serializer.dumps(payload)


def read_session_token(token: str) -> dict | None:
    """The token's claims ({'user_id', optional 'mfa_at'}), or None if invalid/expired/tampered.
    Caller should treat None as 'not logged in', never raise it as an error to the client."""
    try:
        data = _serializer.loads(token, max_age=SESSION_MAX_AGE_SECONDS)
    except BadSignature:  # SignatureExpired is a subclass
        return None
    if not isinstance(data, dict) or not isinstance(data.get("user_id"), int):
        return None
    return data


def verify_session_token(token: str) -> int | None:
    """Returns the user_id if the token is valid, else None."""
    data = read_session_token(token)
    return data["user_id"] if data else None