from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class LeetcodeStats(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    username: str
    easy: int = 0
    medium: int = 0
    hard: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))