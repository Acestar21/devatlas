import hmac

from fastapi import Depends, Header, HTTPException, Request
from sqlmodel import Session

from app.auth.mfa import elevated_until, get_mfa
from app.auth.session import SESSION_COOKIE_NAME, read_session_token
from app.config import settings
from app.database import get_session
from app.models.user import User
from app.moderation import ROLE_ADMIN, effective_role, is_staff


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_session),
) -> User | None:
    """Returns the logged-in User if the session cookie is valid, else None.
    Use this for routes that behave differently for logged-in vs anonymous
    visitors but don't require login (e.g. a public profile page that shows
    an 'edit' button only to the owner).
    Also stashes the token's MFA timestamp on request.state for require_moderator.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    claims = read_session_token(token)
    if claims is None:
        return None

    request.state.mfa_at = claims.get("mfa_at")
    return db.get(User, claims["user_id"])


def require_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Use this for routes that must have a logged-in user
    (e.g. editing your own profile). Raises 401 if not logged in.
    """
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_internal_secret(x_internal_secret: str = Header(...)) -> None:
    """For routes that only our own Next.js server may call (they return session tokens).
    The raw secret is sent only by the OAuth callback route and /api/mfa/[action]."""
    if not hmac.compare_digest(x_internal_secret.encode(), settings.internal_api_secret.encode()):
        raise HTTPException(status_code=403, detail="Forbidden")


def require_staff(user: User = Depends(require_current_user)) -> User:
    """Staff role only, NO MFA check. Used by the MFA routes themselves (you can't be
    elevated before you've done MFA). Non-staff get a 404: the panel doesn't exist for them."""
    if not is_staff(user):
        raise HTTPException(status_code=404, detail="Not found")
    return user


def require_moderator(
    request: Request,
    user: User = Depends(require_staff),
    db: Session = Depends(get_session),
) -> User:
    """Gate for every /mod route: staff role AND a fresh MFA-elevated session."""
    mfa = get_mfa(db, user.id)
    if elevated_until(getattr(request.state, "mfa_at", None), mfa) is None:
        raise HTTPException(
            status_code=403,
            detail={"code": "mfa_required", "message": "Verify your authenticator code to continue."},
        )
    return user


def require_admin_role(user: User = Depends(require_moderator)) -> User:
    if effective_role(user) != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return user