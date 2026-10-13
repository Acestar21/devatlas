from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select
from sqlalchemy import func
from app.sqlutil import escape_like
from app.database import get_session
from app.rate_limit import limiter
from app.models.tag import Tag
from app.models.user import User
from app.auth.dependencies import require_current_user

MAX_PENDING_PER_USER = 10

router = APIRouter(prefix="/tags", tags=["tags"])

VALID_CATEGORIES = {"stack", "game", "interest"}

TAG_ALIASES = {
    "stack": {
        "golang": "go",
        "cpp": "c++",
        "c plus plus": "c++",
        "ts": "typescript",
        "typescipt": "typescript",
        "typescript": "typescript",
    },
}


def _canonical_search(category: str, value: str) -> str:
    normalized = " ".join(value.strip().casefold().split())
    return TAG_ALIASES.get(category, {}).get(normalized, normalized)


@router.get("")
@limiter.limit("120/minute")
def search_tags(
    request: Request,
    category: str = Query(..., description="stack | game | interest"),
    search: str = Query("", max_length=50, description="partial name match, case-insensitive"),
    db: Session = Depends(get_session),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    query = select(Tag).where(Tag.category == category, Tag.status == "approved")
    if search:
        canonical = _canonical_search(category, search)
        query = query.where(Tag.name.ilike(escape_like(canonical), escape="\\"))

    results = db.exec(query.limit(20)).all()
    return [{"id": t.id, "name": t.name} for t in results]


@router.post("")
@limiter.limit("10/minute")
def submit_tag(
    request: Request,
    name: str = Query(..., max_length=50),
    category: str = Query(...),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {VALID_CATEGORIES}")

    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name cannot be empty")

    canonical = _canonical_search(category, name)

    # Case-insensitive check against ALL tags (approved or pending) to avoid
    # duplicate submissions of the same tag under different casing.
    existing = db.exec(
        select(Tag).where(Tag.category == category, func.lower(Tag.name) == canonical)
    ).first()

    if existing:
        if existing.status == "approved":
            return {"id": existing.id, "name": existing.name, "status": "approved"}
        # Already pending from someone else — don't create a duplicate,
        # just let this user know it's already awaiting review.
        return {"id": existing.id, "name": existing.name, "status": "pending"}

    waiting = db.exec(
        select(func.count()).select_from(Tag).where(
            Tag.submitted_by_user_id == current_user.id, Tag.status == "pending"
        )
    ).one()
    if waiting >= MAX_PENDING_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"You already have {MAX_PENDING_PER_USER} tags waiting for review. Please wait for those first.",
        )

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
