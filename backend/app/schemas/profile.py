import datetime as dt
from typing import Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_URL_SCHEMES = ("http://", "https://")

ALLOWED_CARDS = {
    "github": {"graph", "stats", "pinned", "languages", "activity"},
    "activity": {"leetcode", "posts"},
    "games": {"handles"},
}

GAMING_PLATFORMS = {"steam", "riot", "psn", "xbox", "epic", "discord", "other"}


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


class Post(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    date: Optional[str] = None            # YYYY-MM-DD
    read_minutes: Optional[int] = None
    tags: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None       # reserved for later; not collected or shown yet

    @field_validator("url")
    @classmethod
    def check_url(cls, v: str) -> str:
        return validate_url(v)

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 120:
            raise ValueError("Title must be 1-120 characters")
        return v

    @field_validator("description")
    @classmethod
    def check_description(cls, v):
        v = (v or "").strip()
        if len(v) > 280:
            raise ValueError("Description must be 280 characters or fewer")
        return v or None

    @field_validator("date")
    @classmethod
    def check_date(cls, v):
        v = (v or "").strip()
        if not v:
            return None
        dt.date.fromisoformat(v)
        return v

    @field_validator("read_minutes")
    @classmethod
    def check_read(cls, v):
        if v is None:
            return None
        if not 1 <= v <= 120:
            raise ValueError("Read time must be 1-120 minutes")
        return v

    @field_validator("tags")
    @classmethod
    def check_tags(cls, v):
        tags = [t.strip() for t in v if t.strip()]
        if len(tags) > 3 or any(len(t) > 24 for t in tags):
            raise ValueError("Up to 3 tags, 24 characters each")
        return tags

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v):
        v = (v or "").strip()
        if not v:
            return None
        if not v.startswith("https://") or len(v) > 500:
            raise ValueError("Image URL must start with https://")
        return v


class Game(BaseModel):
    name: str
    detail: Optional[str] = None  # rank, hours, anything short
    url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 60:
            raise ValueError("Game name must be 1-60 characters")
        return v

    @field_validator("detail")
    @classmethod
    def check_detail(cls, v):
        return (v or "").strip()[:40] or None

    @field_validator("url")
    @classmethod
    def check_url(cls, v):
        v = (v or "").strip()
        if not v:
            return None
        if len(v) > 300:
            raise ValueError("Link is too long")
        return validate_url(v)


class GamingHandle(BaseModel):
    platform: str
    handle: str

    @field_validator("platform")
    @classmethod
    def check_platform(cls, v: str) -> str:
        if v not in GAMING_PLATFORMS:
            raise ValueError("Unknown platform")
        return v

    @field_validator("handle")
    @classmethod
    def check_handle(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 40:
            raise ValueError("Handle must be 1-40 characters")
        return v


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


class CalendarDay(BaseModel):
    date: str
    count: int


class ExtraStats(BaseModel):
    commits: int = 0
    pull_requests: int = 0
    issues: int = 0
    reviews: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    followers: int = 0
    public_repos: int = 0
    total_stars: int = 0
    prs_all_time: int = 0
    joined: Optional[str] = None


class ActivityItem(BaseModel):
    type: str
    repo: str
    text: str
    at: str
    url: str


class GithubStatsResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    total_contributions: Optional[int] = None
    top_languages: list[str] = Field(default_factory=list)
    pinned_repos: list[PinnedRepository] = Field(default_factory=list)
    calendar: Optional[list[list[CalendarDay]]] = None
    extra: Optional[ExtraStats] = None
    activity: Optional[list[ActivityItem]] = None


class TagResponse(BaseModel):
    id: int
    name: str


class LeetcodeResponse(BaseModel):
    username: str
    url: str
    easy: int
    medium: int
    hard: int
    total: int

class ModerationInfo(BaseModel):
    suspended: bool
    reason: Optional[str] = None
    until: Optional[str] = None  # ISO timestamp (UTC) or None = until lifted

class ProfileResponse(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme: str
    content_links: list[ContentLink] = Field(default_factory=list)
    stack_tags: list[TagResponse] = Field(default_factory=list)
    stats: Optional[GithubStatsResponse] = None
    games: Optional[list[Game]] = None
    gaming_handles: Optional[list[GamingHandle]] = None
    interests: Optional[list[TagResponse]] = None
    leetcode: Optional[LeetcodeResponse] = None
    posts: Optional[list[Post]] = None
    is_owner: bool
    section_visibility: SectionVisibility
    card_visibility: dict[str, dict[str, bool]] = Field(default_factory=dict)
    moderation: Optional[ModerationInfo] = None  # only for the owner and staff
    viewer_role: str = "anonymous"  # the VIEWER's role: anonymous | user | moderator | admin

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
    card_visibility: Optional[dict[str, dict[str, bool]]] = None
    posts: Optional[list[Post]] = None
    games: Optional[list[Game]] = None
    gaming_handles: Optional[list[GamingHandle]] = None

    @field_validator("card_visibility")
    @classmethod
    def check_cards(cls, v):
        if v is None:
            return v
        for page, cards in v.items():
            if page not in ALLOWED_CARDS or not set(cards) <= ALLOWED_CARDS[page]:
                raise ValueError("Unknown card")
        return v