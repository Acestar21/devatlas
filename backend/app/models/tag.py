from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: str  # "stack" | "game" | "interest" — plain string, no enum needed at this scale
    status: str = Field(default="pending")  # "pending" | "approved"
    submitted_by_user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)