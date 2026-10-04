from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth.dependencies import require_current_user
from app.database import get_session
from app.models.moderation import Report
from app.models.user import User
from app.services.notify import notify_staff

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_CATEGORIES = {"inappropriate_image", "harassment", "spam", "impersonation", "other"}
MAX_REPORTS_PER_HOUR = 5  # per reporter, counted in the DB by GitHub id (survives delete + re-signup)
MAX_DETAILS_LENGTH = 500


class ReportCreate(BaseModel):
    username: str
    category: str
    details: str | None = None


@router.post("")
def create_report(
    body: ReportCreate,
    background: BackgroundTasks,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    if body.category not in REPORT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Pick a valid report category.")

    target = db.exec(select(User).where(User.github_username == body.username)).first()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't report yourself.")

    recent = db.exec(
        select(Report).where(
            Report.reporter_github_id == current_user.github_id,
            Report.created_at > datetime.now(timezone.utc) - timedelta(hours=1),
        )
    ).all()
    if len(recent) >= MAX_REPORTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="You're sending reports too quickly. Try again later.")

    already_open = db.exec(
        select(Report).where(
            Report.reporter_github_id == current_user.github_id,
            Report.target_user_id == target.id,
            Report.status == "open",
        )
    ).first()
    if already_open:
        return {"message": "You've already reported this profile. Moderators will review it."}

    details = (body.details or "").strip()[:MAX_DETAILS_LENGTH] or None
    db.add(Report(
        reporter_user_id=current_user.id,
        reporter_github_id=current_user.github_id,
        reporter_username=current_user.github_username,
        target_user_id=target.id,
        category=body.category,
        details=details,
    ))
    db.commit()

    # Usernames and category are server-controlled; free-text details are deliberately NOT sent to Discord.
    background.add_task(notify_staff, f"New report: @{target.github_username} (id {target.id}), category: {body.category}")
    return {"message": "Report sent. Thank you."}