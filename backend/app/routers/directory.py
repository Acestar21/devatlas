import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.models.profile import Profile
from app.models.github_stats import GithubStatsCache
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserGame, UserInterest

router = APIRouter(prefix="/directory", tags=["directory"])

DEFAULT_VISIBILITY = {"github": True, "leetcode": True, "games": True, "interests": True}
PAGE_SIZE = 12


def _visibility_for(profile: Optional[Profile]) -> dict:
    if not profile:
        return DEFAULT_VISIBILITY
    return json.loads(profile.section_visibility_json)


def _stack_tags_for(user_id: int, db: Session) -> list[str]:
    rows = db.exec(
        select(Tag.name).join(StackTag, StackTag.tag_id == Tag.id).where(StackTag.user_id == user_id)
    ).all()
    return list(rows)


def _one_hint(user_id: int, visibility: dict, db: Session) -> Optional[dict]:
    """A single lightweight personal-layer hint for the directory card —
    one game or interest, whichever exists and is visible. Never both,
    keeps the card lightweight. Respects visibility same as the full
    profile page — a hidden section never leaks a hint either.
    """
    if visibility.get("games", True):
        game = db.exec(
            select(Tag.name)
            .join(UserGame, UserGame.tag_id == Tag.id)
            .where(UserGame.user_id == user_id)
            .limit(1)
        ).first()
        if game:
            return {"type": "game", "name": game}

    if visibility.get("interests", True):
        interest = db.exec(
            select(Tag.name)
            .join(UserInterest, UserInterest.tag_id == Tag.id)
            .where(UserInterest.user_id == user_id)
            .limit(1)
        ).first()
        if interest:
            return {"type": "interest", "name": interest}

    return None


@router.get("")
def browse_directory(
    search: str = Query("", description="matches username or display name"),
    stack: str = Query("", description="filter by stack tag name"),
    sort: str = Query("newest", description="newest | active"),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_session),
):
    query = select(User)

    if search:
        query = query.where(
            (User.github_username.ilike(f"%{search}%"))
            | (User.display_name.ilike(f"%{search}%"))
        )

    if stack:
        query = query.join(StackTag, StackTag.user_id == User.id).join(
            Tag, Tag.id == StackTag.tag_id
        ).where(Tag.name.ilike(f"%{stack}%"))

    if sort == "active":
        query = query.outerjoin(
            GithubStatsCache, GithubStatsCache.user_id == User.id
        ).order_by(GithubStatsCache.total_contributions.desc().nullslast())
    else:
        query = query.order_by(User.created_at.desc())

    total = len(db.exec(query).all())  # simple count; fine at this scale
    query = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    users = db.exec(query).all()

    cards = []
    for user in users:
        profile = db.exec(select(Profile).where(Profile.user_id == user.id)).first()
        visibility = _visibility_for(profile)

        cache = db.exec(
            select(GithubStatsCache).where(GithubStatsCache.user_id == user.id)
        ).first()
        # Directory NEVER triggers a live fetch — read-only from cache,
        # same rule as badges. Avoids burning GitHub API rate limits on
        # every directory page load.
        contributions = None
        if cache and visibility.get("github", True):
            contributions = cache.total_contributions

        cards.append(
            {
                "username": user.github_username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "bio": profile.bio if profile else None,
                "stack_tags": _stack_tags_for(user.id, db),
                "contributions": contributions,
                "hint": _one_hint(user.id, visibility, db),
            }
        )

    return {
        "results": cards,
        "page": page,
        "page_size": PAGE_SIZE,
        "total": total,
        "total_pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE),
    }