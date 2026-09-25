import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.rate_limit import limiter
from app.database import get_session
from app.models.user import User
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserGame, UserInterest
from app.auth.dependencies import get_current_user_optional, require_current_user
from app.schemas.profile import ProfileResponse, ProfileUpdate, ProfileUpdateResponse
from app.services.github import is_stale, fetch_and_cache_stats, GithubTokenInvalid


router = APIRouter(prefix="/profiles", tags=["profiles"])

DEFAULT_VISIBILITY = {"github": True, "leetcode": True, "games": True, "interests": True}


def _get_stack_tags(user_id: int, db: Session) -> list[dict]:
    rows = db.exec(
        select(Tag.id, Tag.name)
        .join(StackTag, StackTag.tag_id == Tag.id)
        .where(StackTag.user_id == user_id)
    ).all()
    return [{"id": r[0], "name": r[1]} for r in rows]


def _get_interests(user_id: int, db: Session) -> list[dict]:
    rows = db.exec(
        select(Tag.id, Tag.name)
        .join(UserInterest, UserInterest.tag_id == Tag.id)
        .where(UserInterest.user_id == user_id)
    ).all()
    return [{"id": r[0], "name": r[1]} for r in rows]


def _get_games(user_id: int, db: Session) -> list[dict]:
    rows = db.exec(
        select(Tag.name, UserGame.tag_id, UserGame.rank_or_hours, UserGame.profile_url, UserGame.platform)
        .join(UserGame, UserGame.tag_id == Tag.id)
        .where(UserGame.user_id == user_id)
    ).all()
    return [
        {
            "tag_id": r[1],
            "name": r[0],
            "rank_or_hours": r[2],
            "profile_url": r[3],
            "platform": r[4],
        }
        for r in rows
    ]


def _build_profile_payload(user: User, viewer: User | None, db: Session, cache) -> dict:
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
        stats_block = {"available": False, "reason": "GitHub stats are temporarily unavailable."}

    stack_tags = _get_stack_tags(user.id, db)

    games = None
    if is_owner or visibility.get("games", True):
        games = _get_games(user.id, db)

    interests = None
    if is_owner or visibility.get("interests", True):
        interests = _get_interests(user.id, db)

    return {
        "username": user.github_username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": bio,
        "theme": theme,
        "content_links": content_links,
        "stack_tags": stack_tags,
        "stats": stats_block,
        "games": games,
        "interests": interests,
        "is_owner": is_owner,
        "section_visibility": visibility,
    }


# IMPORTANT: this must be registered BEFORE the /{username} route below.
# FastAPI matches routes in registration order, and /{username} is a
# catch-all path param that would otherwise swallow "/me" as if it were
# a literal username.
@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    cache = db.exec(
        select(GithubStatsCache).where(GithubStatsCache.user_id == current_user.id)
    ).first()

    if is_stale(cache):
        try:
            cache = await fetch_and_cache_stats(current_user, db)
        except GithubTokenInvalid:
            pass

    return _build_profile_payload(current_user, current_user, db, cache)


@router.get("/{username}", response_model=ProfileResponse)
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

    return _build_profile_payload(user, viewer, db, cache)


@router.patch("/me", response_model=ProfileUpdateResponse)
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

    if update.display_name is not None:
        current_user.display_name = update.display_name.strip() or None
        db.add(current_user)

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
        "display_name": current_user.display_name,
        "bio": profile.bio,
        "theme": profile.theme,
        "content_links": json.loads(profile.content_links_json),
        "section_visibility": json.loads(profile.section_visibility_json),
    }