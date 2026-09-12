from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserGame, UserInterest
from app.auth.dependencies import require_current_user
from app.schemas.profile import validate_url

router = APIRouter(prefix="/profiles/me", tags=["profile-tags"])

VALID_PLATFORMS = {"steam", "riot", "psn", "xbox", "other"}


def _get_tag_or_404(tag_id: int, expected_category: str, db: Session) -> Tag:
    tag = db.get(Tag, tag_id)
    if not tag or tag.category != expected_category:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.post("/stack/{tag_id}")
def add_stack_tag(
    tag_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    _get_tag_or_404(tag_id, "stack", db)

    already_linked = db.exec(
        select(StackTag).where(
            StackTag.user_id == current_user.id, StackTag.tag_id == tag_id
        )
    ).first()
    if already_linked:
        return {"message": "Already added"}

    db.add(StackTag(user_id=current_user.id, tag_id=tag_id))
    db.commit()
    return {"message": "Stack tag added"}


@router.delete("/stack/{tag_id}")
def remove_stack_tag(
    tag_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    link = db.exec(
        select(StackTag).where(
            StackTag.user_id == current_user.id, StackTag.tag_id == tag_id
        )
    ).first()
    if link:
        db.delete(link)
        db.commit()
    return {"message": "Stack tag removed"}


@router.post("/interests/{tag_id}")
def add_interest(
    tag_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    _get_tag_or_404(tag_id, "interest", db)

    already_linked = db.exec(
        select(UserInterest).where(
            UserInterest.user_id == current_user.id, UserInterest.tag_id == tag_id
        )
    ).first()
    if already_linked:
        return {"message": "Already added"}

    db.add(UserInterest(user_id=current_user.id, tag_id=tag_id))
    db.commit()
    return {"message": "Interest added"}


@router.delete("/interests/{tag_id}")
def remove_interest(
    tag_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    link = db.exec(
        select(UserInterest).where(
            UserInterest.user_id == current_user.id, UserInterest.tag_id == tag_id
        )
    ).first()
    if link:
        db.delete(link)
        db.commit()
    return {"message": "Interest removed"}


@router.post("/games/{tag_id}")
def add_game(
    tag_id: int,
    profile_url: str,
    platform: str,
    rank_or_hours: str | None = None,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    _get_tag_or_404(tag_id, "game", db)

    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"platform must be one of {VALID_PLATFORMS}")

    try:
        validate_url(profile_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    already_linked = db.exec(
        select(UserGame).where(
            UserGame.user_id == current_user.id, UserGame.tag_id == tag_id
        )
    ).first()
    if already_linked:
        raise HTTPException(status_code=400, detail="Game already added — remove it first to update")

    db.add(
        UserGame(
            user_id=current_user.id,
            tag_id=tag_id,
            profile_url=profile_url,
            platform=platform,
            rank_or_hours=rank_or_hours,
        )
    )
    db.commit()
    return {"message": "Game added"}


@router.delete("/games/{tag_id}")
def remove_game(
    tag_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    link = db.exec(
        select(UserGame).where(
            UserGame.user_id == current_user.id, UserGame.tag_id == tag_id
        )
    ).first()
    if link:
        db.delete(link)
        db.commit()
    return {"message": "Game removed"}