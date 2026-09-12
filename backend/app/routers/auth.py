import secrets
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, Request, Header
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from app.rate_limit import limiter
from app.config import settings
from app.database import get_session
from app.models.user import User
from app.auth.crypto import encrypt_token
from app.auth.session import create_session_token, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS

router = APIRouter(prefix="/auth/github", tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API_URL = "https://api.github.com/user"

# Anti-bot / anti-alt-account measure: reject signup (not login) if the
# GitHub account is younger than this. Only applies to brand-new DevAtlas
# users — existing users are never re-checked or locked out retroactively.
MIN_ACCOUNT_AGE_DAYS = 30

# Simple in-memory state store for CSRF protection on the OAuth callback.
# Fine for a single-process dev setup. If you ever run multiple backend
# processes/workers, this needs to move to Redis or the DB instead —
# an in-memory set won't be shared across processes.
_pending_states: set[str] = set()


@router.get("/login")
@limiter.limit("10/minute")
def github_login(request: Request):
    state = secrets.token_urlsafe(32)
    _pending_states.add(state)

    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_oauth_callback_url,
        "scope": "read:user",  # public profile data only — no repo write access needed
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{query}")


@router.post("/internal/exchange")
@limiter.limit("20/minute")
async def github_internal_exchange(
    request: Request,
    code: str,
    state: str,
    x_internal_secret: str = Header(...),
    session: Session = Depends(get_session),
):
    # Only Vercel's own API route should ever call this — never exposed
    # to the browser or GitHub directly. The secret value lives only in
    # Render's and Vercel's environment variables, never in this repo.
    if x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=403, detail="Forbidden")

    if state not in _pending_states:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    _pending_states.discard(state)

    async with httpx.AsyncClient() as client:
        # Exchange the temporary code for an access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_callback_url,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub token exchange failed")

        # Fetch the user's public GitHub profile using that token
        user_resp = await client.get(
            GITHUB_USER_API_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        gh_user = user_resp.json()

    github_id = gh_user["id"]
    github_username = gh_user["login"]

    # Upsert: does this GitHub user already have a DevCard account?
    existing = session.exec(select(User).where(User.github_id == github_id)).first()

    # Anti-bot check — only for brand-new signups, never for existing users
    # logging back in. GitHub's user API returns created_at as an ISO 8601
    # string, e.g. "2019-05-14T12:34:56Z".
    if existing is None:
        account_created_at = datetime.strptime(
            gh_user["created_at"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=timezone.utc)
        account_age_days = (datetime.now(timezone.utc) - account_created_at).days

        if account_age_days < MIN_ACCOUNT_AGE_DAYS:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"GitHub accounts must be at least {MIN_ACCOUNT_AGE_DAYS} days "
                    "old to sign up for DevAtlas. This helps keep the directory "
                    "free of bots and throwaway accounts."
                ),
            )

    encrypted = encrypt_token(access_token)

    if existing:
        existing.github_username = github_username
        existing.display_name = gh_user.get("name")
        existing.avatar_url = gh_user.get("avatar_url")
        existing.encrypted_github_token = encrypted
        session.add(existing)
        session.commit()
        session.refresh(existing)
        user = existing
    else:
        user = User(
            github_id=github_id,
            github_username=github_username,
            display_name=gh_user.get("name"),
            avatar_url=gh_user.get("avatar_url"),
            encrypted_github_token=encrypted,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    session_token = create_session_token(user.id)

    # No cookie set here — this is a server-to-server response.
    # Vercel's API route is responsible for setting the cookie on
    # its own domain once it receives this.
    return {
        "session_token": session_token,
        "github_username": user.github_username,
    }


@router.get("/logout")
def logout():
    # Kept for backward compatibility / direct testing only.
    # The real logout flow now happens via Vercel's own API route,
    # since that's where the session cookie actually lives.
    return {"message": "This endpoint is no longer used by the frontend. Logout happens via /api/auth/logout on the frontend domain."}