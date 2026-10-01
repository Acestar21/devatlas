from typing import Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_URL_SCHEMES = ("http://", "https://")

ALLOWED_CARDS = {
    "github": {"graph", "stats", "pinned", "languages", "activity"},
    "activity": {"leetcode", "posts"},
}


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


class GameResponse(BaseModel):
    tag_id: int
    name: str
    rank_or_hours: Optional[str] = None
    profile_url: str
    platform: str


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
    leetcode: Optional[LeetcodeResponse] = None
    posts: Optional[list[Post]] = None
    is_owner: bool
    section_visibility: SectionVisibility
    card_visibility: dict[str, dict[str, bool]] = Field(default_factory=dict)


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

    @field_validator("card_visibility")
    @classmethod
    def check_cards(cls, v):
        if v is None:
            return v
        for page, cards in v.items():
            if page not in ALLOWED_CARDS or not set(cards) <= ALLOWED_CARDS[page]:
                raise ValueError("Unknown card")
        return v