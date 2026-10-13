from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.time import utc_now


class JournalEntry(SQLModel, table=True):
    """A short public update that disappears 24 hours after it was posted.

    ACTIVE  = ended_at IS NULL AND expires_at > now. Only active entries count toward the
    per-user limit and only active entries are ever shown. "Ending" an entry just sets ended_at
    (kept briefly so a reported entry can still be looked at); rows are purged after
    app.services.journal.RETENTION_DAYS.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    body: str
    genre: Optional[str] = None  # optional; one of app.services.journal.GENRES
    created_at: datetime = Field(default_factory=utc_now, index=True)
    expires_at: datetime = Field(index=True)
    ended_at: Optional[datetime] = None  # set when the owner (or a moderator) ends it early
