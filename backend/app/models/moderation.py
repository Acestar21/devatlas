from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import SQLModel, Field


def _user_fk(*, ondelete: str, nullable: bool = True, index: bool = True) -> Column:
    """FK to user.id with an explicit ON DELETE rule, so deleting an account (routers/account.py)
    can never be blocked by moderation rows, even if someone forgets to update that function.
    SET NULL keeps the row (audit history survives); CASCADE removes it with the user."""
    return Column(Integer, ForeignKey("user.id", ondelete=ondelete), nullable=nullable, index=index)


class Report(SQLModel, table=True):
    """One user's report about another user's profile."""
    id: Optional[int] = Field(default=None, primary_key=True)
    reporter_user_id: Optional[int] = Field(default=None, sa_column=_user_fk(ondelete="SET NULL"))
    target_user_id: int = Field(sa_column=_user_fk(ondelete="CASCADE", nullable=False))  # reports about a deleted user go away
    category: str  # see REPORT_CATEGORIES in routers/reports.py
    details: Optional[str] = None
    status: str = Field(default="open", index=True)  # open | actioned | dismissed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    handled_by_user_id: Optional[int] = Field(default=None, sa_column=_user_fk(ondelete="SET NULL", index=False))
    handled_at: Optional[datetime] = None
    resolution_note: Optional[str] = None


class ModerationLog(SQLModel, table=True):
    """Append-only audit trail. Usernames are snapshotted so history stays readable after
    an account is deleted or renamed. Never update or delete rows here."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    actor_user_id: Optional[int] = Field(default=None, sa_column=_user_fk(ondelete="SET NULL"))
    actor_username: str
    action: str = Field(index=True)  # see ACTIONS in app/moderation.py
    target_user_id: Optional[int] = Field(default=None, sa_column=_user_fk(ondelete="SET NULL"))
    target_username: Optional[str] = None
    report_id: Optional[int] = None  # plain int on purpose: no FK, reports can be deleted
    note: Optional[str] = None