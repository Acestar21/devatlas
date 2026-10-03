from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
 
 
class User(SQLModel, table=True):
    """A registered DevCard user, identified by their GitHub account.
 
    github_id is the source of truth for identity (immutable).
    username can change on GitHub; we snapshot it here but github_id
    is what we actually key relationships on.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    github_id: int = Field(unique=True, index=True)
    github_username: str = Field(unique=True, index=True)
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
 
    # Encrypted (Fernet) GitHub OAuth access token.
    # NEVER return this field in any API response schema.
    encrypted_github_token: Optional[str] = Field(default=None, exclude=True, repr=False)
    encrypted_refresh_token: Optional[str] = Field(default=None, exclude=True, repr=False)
        # --- moderation (rules live in app/moderation.py) ---
    role: str = Field(default="user")  # "user" | "moderator" | "admin"; see effective_role()
    suspended: bool = Field(default=False)
    suspended_until: Optional[datetime] = None  # None while suspended=True means "until a moderator lifts it"
    suspension_reason: Optional[str] = None  # shown to the suspended user
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
