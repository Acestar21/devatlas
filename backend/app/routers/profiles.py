import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.rate_limit import limiter
from app.database import get_session
from app.models.user import User
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.models.leetcode import LeetcodeStats
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserInterest
from app.auth.dependencies import get_current_user_optional, require_current_user
from app.schemas.profile import ProfileResponse, ProfileUpdate, ProfileUpdateResponse
from app.services.github import is_stale, fetch_and_cache_stats, GithubTokenInvalid
from app.moderation import can_view_profile, effective_role, is_staff, moderation_info

router = APIRouter(prefix="/profiles", tags=["profiles"])

DEFAULT_VISIBILITY = {"github": True, "leetcode": True, "games": True, "interests": True}

DEFAULT_CARD_VISIBILITY = {
    "github": {"graph": True, "stats": True, "pinned": True, "languages": True, "activity": True},
    "activity": {"leetcode": True, "posts": True},
    "games": {"handles": True},
}

# which keys of the stats block each GitHub-page card owns
CARD_STATS_KEYS = {
    "graph": ["calendar"],
    "stats": ["extra"],
    "pinned": ["pinned_repos"],
    "languages": ["top_languages"],
    "activity": ["activity"],
}

MAX_GAMES = 12
MAX_HANDLES = 8
MAX_POSTS = 10


def _card_visibility(profile: Profile | None) -> dict:
    stored = json.loads(profile.card_visibility_json) if profile else {}
    return {
        page: {**cards, **stored.get(page, {})}
        for page, cards in DEFAULT_CARD_VISIBILITY.items()
    }


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


def _build_profile_payload(user: User, viewer: User | None, db: Session, cache) -> dict:
    is_owner = bool(viewer and viewer.id == user.id)

    profile = db.exec(select(Profile).where(Profile.user_id == user.id)).first()

    bio = profile.bio if profile else None
    theme = profile.theme if profile else "default"
    content_links = json.loads(profile.content_links_json) if profile else []
    visibility = (
        json.loads(profile.section_visibility_json) if profile else DEFAULT_VISIBILITY
    )
    card_vis = _card_visibility(profile)

    stats_block = None
    if cache and (is_owner or visibility.get("github", True)):
        stats_block = {
            "available": True,
            "total_contributions": cache.total_contributions,
            "top_languages": json.loads(cache.top_languages_json),
            "pinned_repos": json.loads(cache.pinned_repos_json),
            "calendar": json.loads(cache.calendar_json),
            "extra": json.loads(cache.extra_stats_json) or None,
            "activity": json.loads(cache.activity_json),
        }
        # Hidden cards never leave the server for non-owners.
        if not is_owner:
            for card, keys in CARD_STATS_KEYS.items():
                if not card_vis["github"][card]:
                    for k in keys:
                        stats_block.pop(k, None)
    elif not cache:
        stats_block = {"available": False, "reason": "GitHub stats are temporarily unavailable."}

    stack_tags = _get_stack_tags(user.id, db)

    games = None
    gaming_handles = None
    if is_owner or visibility.get("games", True):
        games = json.loads(profile.games_json) if profile else []
        if is_owner or card_vis["games"]["handles"]:
            gaming_handles = json.loads(profile.gaming_handles_json) if profile else []

    interests = None
    if is_owner or visibility.get("interests", True):
        interests = _get_interests(user.id, db)

    leetcode = None
    lc = db.exec(select(LeetcodeStats).where(LeetcodeStats.user_id == user.id)).first()
    if lc and (is_owner or (visibility.get("leetcode", True) and card_vis["activity"]["leetcode"])):
        leetcode = {
            "username": lc.username,
            "url": f"https://leetcode.com/u/{lc.username}/",  # built server-side, never user-supplied
            "easy": lc.easy,
            "medium": lc.medium,
            "hard": lc.hard,
            "total": lc.easy + lc.medium + lc.hard,
        }

    posts = None
    if is_owner or card_vis["activity"]["posts"]:
        posts = json.loads(profile.posts_json) if profile else []

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
        "gaming_handles": gaming_handles,
        "interests": interests,
        "leetcode": leetcode,
        "posts": posts,
        "is_owner": is_owner,
        "section_visibility": visibility,
        "card_visibility": card_vis,
        "layout": json.loads(profile.layout_json) if profile and profile.layout_json else {},
        "moderation": moderation_info(user) if (is_owner or is_staff(viewer)) else None,
        "viewer_role": effective_role(viewer),
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
    
    if not can_view_profile(user, viewer):
        # Identical to "no such user": don't reveal that a profile is suspended.
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

    if update.card_visibility is not None:
        merged = _card_visibility(profile)
        for page, cards in update.card_visibility.items():
            merged[page].update(cards)
        profile.card_visibility_json = json.dumps(merged)

    if update.posts is not None:
        if len(update.posts) > MAX_POSTS:
            raise HTTPException(status_code=400, detail=f"Up to {MAX_POSTS} posts allowed.")
        profile.posts_json = json.dumps([p.model_dump() for p in update.posts])

    if update.games is not None:
        if len(update.games) > MAX_GAMES:
            raise HTTPException(status_code=400, detail=f"Up to {MAX_GAMES} games allowed.")
        profile.games_json = json.dumps([g.model_dump() for g in update.games])

    if update.gaming_handles is not None:
        if len(update.gaming_handles) > MAX_HANDLES:
            raise HTTPException(status_code=400, detail=f"Up to {MAX_HANDLES} handles allowed.")
        profile.gaming_handles_json = json.dumps([h.model_dump() for h in update.gaming_handles])

    if update.layout is not None:
        profile.layout_json = update.layout.model_dump_json()

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
