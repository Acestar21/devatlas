from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.models.tag import Tag
from app.auth.dependencies import require_current_user
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(require_current_user)) -> User:
    if current_user.github_id != settings.admin_github_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user


@router.get("/pending-tags")
def list_pending_tags(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session),
):
    pending = db.exec(select(Tag).where(Tag.status == "pending")).all()
    return pending


@router.post("/tags/{tag_id}/approve")
def approve_tag(
    tag_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session),
):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.status = "approved"
    db.add(tag)
    db.commit()
    return {"message": f"Tag '{tag.name}' approved"}


@router.delete("/tags/{tag_id}")
def reject_tag(
    tag_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session),
):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return {"message": f"Tag '{tag.name}' rejected and deleted"}