from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models.tag import Tag
from app.models.user import User
from app.auth.dependencies import require_current_user

router = APIRouter(prefix="/tags", tags=["tags"])

VALID_CATEGORIES = {"stack", "game", "interest"}


@router.get("")
def search_tags(
    category: str = Query(..., description="stack | game | interest"),
    search: str = Query("", description="partial name match, case-insensitive"),
    db: Session = Depends(get_session),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    query = select(Tag).where(Tag.category == category, Tag.status == "approved")
    if search:
        query = query.where(Tag.name.ilike(f"%{search}%"))

    results = db.exec(query.limit(20)).all()
    return [{"id": t.id, "name": t.name} for t in results]


@router.post("")
def submit_tag(
    name: str,
    category: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name cannot be empty")

    # Case-insensitive check against ALL tags (approved or pending) to avoid
    # duplicate submissions of the same tag under different casing.
    existing = db.exec(
        select(Tag).where(Tag.category == category, Tag.name.ilike(name))
    ).first()

    if existing:
        if existing.status == "approved":
            return {"id": existing.id, "name": existing.name, "status": "approved"}
        # Already pending from someone else — don't create a duplicate,
        # just let this user know it's already awaiting review.
        return {"id": existing.id, "name": existing.name, "status": "pending"}

    tag = Tag(
        name=name,
        category=category,
        status="pending",
        submitted_by_user_id=current_user.id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)

    return {"id": tag.id, "name": tag.name, "status": "pending"}