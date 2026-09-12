import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.rate_limit import limiter
from app.database import get_session
from app.models.user import User
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.auth.dependencies import get_current_user_optional, require_current_user
from app.schemas.profile import ProfileUpdate
from app.services.github import is_stale, fetch_and_cache_stats, GithubTokenInvalid


router = APIRouter(prefix="/profiles", tags=["profiles"])

DEFAULT_VISIBILITY = {"github": True, "leetcode": True, "games": True, "interests": True}


@router.get("/{username}")
@limiter.limit("30/minute")
async def get_profile(
    request: Request,
    username: str,
    db: Session = Depends(get_session),
    viewer: User | None = Depends(get_current_user_optional),
):
    user = db.exec(select(User).where(User.github_username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cache = db.exec(
        select(GithubStatsCache).where(GithubStatsCache.user_id == user.id)
    ).first()

    if is_stale(cache):
        try:
            cache = await fetch_and_cache_stats(user, db)
        except GithubTokenInvalid:
            pass  # degrade gracefully — fall through, serve stale cache if any exists

    is_owner = bool(viewer and viewer.id == user.id)

    profile = db.exec(select(Profile).where(Profile.user_id == user.id)).first()

    bio = profile.bio if profile else None
    theme = profile.theme if profile else "default"
    content_links = json.loads(profile.content_links_json) if profile else []
    visibility = (
        json.loads(profile.section_visibility_json) if profile else DEFAULT_VISIBILITY
    )

    stats_block = None
    if cache and (is_owner or visibility.get("github", True)):
        stats_block = {
            "available": True,
            "total_contributions": cache.total_contributions,
            "top_languages": json.loads(cache.top_languages_json),
            "pinned_repos": json.loads(cache.pinned_repos_json),
        }
    elif not cache:
        # User exists, but no GitHub stats have ever been successfully
        # fetched (first view failed, or GitHub was unreachable). Distinct
        # from "hidden by owner" — the frontend should show an explicit
        # "stats temporarily unavailable" message, not treat this as a
        # missing/nonexistent profile.
        stats_block = {"available": False, "reason": "GitHub stats are temporarily unavailable."}
    # else: cache exists but the owner has hidden the github section from
    # this viewer — stats_block stays None, frontend renders nothing here.

    return {
        "username": user.github_username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": bio,
        "theme": theme,
        "content_links": content_links,
        "stats": stats_block,
        "is_owner": is_owner,
        # Only the owner needs their own visibility settings, to render
        # their own edit UI correctly. Non-owners never receive this.
        "section_visibility": visibility if is_owner else None,
    }


@router.patch("/me")
def update_profile(
    update: ProfileUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    profile = db.exec(
        select(Profile).where(Profile.user_id == current_user.id)
    ).first()

    if profile is None:
        profile = Profile(user_id=current_user.id)

    if update.bio is not None:
        profile.bio = update.bio

    if update.theme is not None:
        profile.theme = update.theme

    if update.content_links is not None:
        profile.content_links_json = json.dumps(
            [link.model_dump() for link in update.content_links]
        )

    if update.section_visibility is not None:
        profile.section_visibility_json = update.section_visibility.model_dump_json()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {
        "bio": profile.bio,
        "theme": profile.theme,
        "content_links": json.loads(profile.content_links_json),
        "section_visibility": json.loads(profile.section_visibility_json),
    }