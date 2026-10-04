from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Index, text


class Tag(SQLModel, table=True):
    __table_args__ = (Index("ix_tag_category_lower_name", "category", text("lower(name)"), unique=True),)
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: str  # "stack" | "game" | "interest" — plain string, no enum needed at this scale
    status: str = Field(default="pending")  # "pending" | "approved"
    submitted_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))