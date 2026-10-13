from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field


class StackTag(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "tag_id", name="uq_stacktag_user_tag"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)


class UserGame(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "tag_id", name="uq_usergame_user_tag"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)  # the game name, via Tag
    rank_or_hours: Optional[str] = None
    profile_url: str
    platform: str  # "steam" | "riot" | "psn" | "xbox" | "other"


class UserInterest(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "tag_id", name="uq_userinterest_user_tag"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)


class UserProject(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    description: Optional[str] = None
    url: str
    display_order: int = Field(default=0)
