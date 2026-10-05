import json
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, not_, or_
from sqlmodel import Session, select

from app.database import get_session
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserInterest
from app.models.user import User
from app.moderation import suspension_active_clause
from app.rate_limit import limiter
from app.sqlutil import escape_like

router = APIRouter(prefix="/directory", tags=["directory"])

DEFAULT_VISIBILITY = {"github": True, "leetcode": True, "games": True, "interests": True}
PAGE_SIZE = 12


def _visibility_for(profile: Optional[Profile]) -> dict:
    if not profile:
        return DEFAULT_VISIBILITY
    return json.loads(profile.section_visibility_json)


def _hint(profile: Optional[Profile], visibility: dict, first_interest: Optional[str]) -> Optional[dict]:
    """One lightweight personal-layer hint per card: a game, else an interest. Respects visibility
    exactly like the full profile page, so a hidden section never leaks a hint."""
    if profile and visibility.get("games", True):
        games = json.loads(profile.games_json)
        if games:
            return {"type": "game", "name": games[0]["name"]}
    if first_interest and visibility.get("interests", True):
        return {"type": "interest", "name": first_interest}
    return None


@router.get("")
@limiter.limit("60/minute")
def browse_directory(
    request: Request,
    search: str = Query("", max_length=60, description="matches username or display name"),
    stack: str = Query("", max_length=40, description="filter by stack tag name"),
    sort: str = Query("newest", description="newest | active"),
    page: int = Query(1, ge=1, le=1000),
    db: Session = Depends(get_session),
):
    base = select(User).where(not_(suspension_active_clause()))

    if search:
        pattern = escape_like(search)
        base = base.where(or_(
            User.github_username.ilike(pattern, escape="\\"),
            User.display_name.ilike(pattern, escape="\\"),
        ))

    if stack:
        # EXISTS instead of a join: a user matching several tags still appears once
        base = base.where(
            select(StackTag.id)
            .join(Tag, Tag.id == StackTag.tag_id)
            .where(StackTag.user_id == User.id, Tag.name.ilike(escape_like(stack), escape="\\"))
            .exists()
        )

    total = db.exec(select(func.count()).select_from(base.subquery())).one()

    if sort == "active":
        ordered = base.outerjoin(GithubStatsCache, GithubStatsCache.user_id == User.id).order_by(
            GithubStatsCache.total_contributions.desc().nullslast(), User.id.desc()
        )
    else:
        ordered = base.order_by(User.created_at.desc(), User.id.desc())
    users = db.exec(ordered.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).all()

    # One query per kind of data for the whole page (no per-user queries).
    ids = [u.id for u in users]
    profiles: dict[int, Profile] = {}
    caches: dict[int, GithubStatsCache] = {}
    stack_by_user: dict[int, list[str]] = defaultdict(list)
    first_interest: dict[int, str] = {}
    if ids:
        profiles = {p.user_id: p for p in db.exec(select(Profile).where(Profile.user_id.in_(ids))).all()}
        caches = {c.user_id: c for c in db.exec(select(GithubStatsCache).where(GithubStatsCache.user_id.in_(ids))).all()}
        for user_id, name in db.exec(
            select(StackTag.user_id, Tag.name).select_from(StackTag)
            .join(Tag, Tag.id == StackTag.tag_id)
            .where(StackTag.user_id.in_(ids)).order_by(StackTag.id)
        ).all():
            stack_by_user[user_id].append(name)
        for user_id, name in db.exec(
            select(UserInterest.user_id, Tag.name).select_from(UserInterest)
            .join(Tag, Tag.id == UserInterest.tag_id)
            .where(UserInterest.user_id.in_(ids)).order_by(UserInterest.id)
        ).all():
            first_interest.setdefault(user_id, name)

    cards = []
    for user in users:
        profile = profiles.get(user.id)
        visibility = _visibility_for(profile)
        cache = caches.get(user.id)
        # Directory NEVER triggers a live GitHub fetch: read-only from cache, same rule as badges.
        contributions = cache.total_contributions if (cache and visibility.get("github", True)) else None
        cards.append({
            "username": user.github_username,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "bio": profile.bio if profile else None,
            "stack_tags": stack_by_user.get(user.id, []),
            "contributions": contributions,
            "hint": _hint(profile, visibility, first_interest.get(user.id)),
        })

    return {
        "results": cards,
        "page": page,
        "page_size": PAGE_SIZE,
        "total": total,
        "total_pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE),
    }