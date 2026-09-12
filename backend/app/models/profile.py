from typing import Optional
from sqlmodel import SQLModel, Field


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    bio: Optional[str] = None
    theme: str = Field(default="default")
    content_links_json: str = Field(default="[]")  # JSON list of {label, url}
    section_visibility_json: str = Field(
        default='{"github": true, "leetcode": true, "games": true, "interests": true}'
    )