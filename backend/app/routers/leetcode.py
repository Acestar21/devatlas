import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.models.leetcode import LeetcodeStats
from app.auth.dependencies import require_current_user

router = APIRouter(prefix="/profiles/me/leetcode", tags=["leetcode"])

USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")  # verify against LeetCode's actual username rules
MAX_COUNT = 5000  # sanity cap only


class LeetcodeUpdate(BaseModel):
    username: str
    easy: int
    medium: int
    hard: int


@router.post("")
def save_leetcode(
    update: LeetcodeUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    username = update.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Enter your LeetCode username, not a URL.")
    if any(not 0 <= v <= MAX_COUNT for v in (update.easy, update.medium, update.hard)):
        raise HTTPException(status_code=400, detail=f"Counts must be between 0 and {MAX_COUNT}.")

    row = db.exec(select(LeetcodeStats).where(LeetcodeStats.user_id == current_user.id)).first()
    if row is None:
        row = LeetcodeStats(user_id=current_user.id, username=username)
    row.username = username
    row.easy, row.medium, row.hard = update.easy, update.medium, update.hard
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    return {"message": "Saved"}