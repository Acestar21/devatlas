from typing import Optional
from pydantic import BaseModel, field_validator

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


class ProfileUpdate(BaseModel):
    # Every field optional — caller sends only what they're actually changing.
    bio: Optional[str] = None
    theme: Optional[str] = None
    content_links: Optional[list[ContentLink]] = None
    section_visibility: Optional[SectionVisibility] = None