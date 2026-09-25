from typing import Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_URL_SCHEMES = ("http://", "https://")


def validate_url(url: str) -> str:
    if not url.startswith(ALLOWED_URL_SCHEMES):
        raise ValueError("URL must start with http:// or https://")
    return url


class ContentLink(BaseModel):
    label: str
    url: str

    @field_validator("url")
    @classmethod
    def check_url(cls, v: str) -> str:
        return validate_url(v)


class SectionVisibility(BaseModel):
    github: bool = True
    leetcode: bool = True
    games: bool = True
    interests: bool = True


class PinnedRepository(BaseModel):
    name: str
    description: Optional[str] = None
    stars: int
    url: str


class GithubStatsResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    total_contributions: Optional[int] = None
    top_languages: list[str] = Field(default_factory=list)
    pinned_repos: list[PinnedRepository] = Field(default_factory=list)


class GameResponse(BaseModel):
    tag_id: int
    name: str
    rank_or_hours: Optional[str] = None
    profile_url: str
    platform: str


class TagResponse(BaseModel):
    id: int
    name: str


class ProfileResponse(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme: str
    content_links: list[ContentLink] = Field(default_factory=list)
    stack_tags: list[TagResponse] = Field(default_factory=list)
    stats: Optional[GithubStatsResponse] = None
    games: Optional[list[GameResponse]] = None
    interests: Optional[list[TagResponse]] = None
    is_owner: bool
    section_visibility: SectionVisibility


class ProfileUpdateResponse(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    theme: str
    content_links: list[ContentLink] = Field(default_factory=list)
    section_visibility: SectionVisibility


class ProfileUpdate(BaseModel):
    # Every field optional — caller sends only what they're actually changing.
    display_name: Optional[str] = None
    bio: Optional[str] = None
    theme: Optional[str] = None
    content_links: Optional[list[ContentLink]] = None
    section_visibility: Optional[SectionVisibility] = None