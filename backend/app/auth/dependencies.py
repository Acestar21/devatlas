from fastapi import Depends, Request, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models.user import User
from app.auth.session import verify_session_token, SESSION_COOKIE_NAME
from app.moderation import ROLE_ADMIN, effective_role, is_staff


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_session),
) -> User | None:
    """Returns the logged-in User if the session cookie is valid, else None.
    Use this for routes that behave differently for logged-in vs anonymous
    visitors but don't require login (e.g. a public profile page that shows
    an 'edit' button only to the owner).
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    user_id = verify_session_token(token)
    if user_id is None:
        return None

    return db.get(User, user_id)


def require_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Use this for routes that must have a logged-in user
    (e.g. editing your own profile). Raises 401 if not logged in.
    """
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_moderator(user: User = Depends(require_current_user)) -> User:
    """Gate for every /mod route. Non-staff get a 404 so the panel looks like it doesn't exist.
    This is the single seam where the MFA check gets added in Step 3."""
    if not is_staff(user):
        raise HTTPException(status_code=404, detail="Not found")
    return user


def require_admin_role(user: User = Depends(require_moderator)) -> User:
    if effective_role(user) != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return user