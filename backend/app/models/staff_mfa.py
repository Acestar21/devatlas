from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import SQLModel, Field


class StaffMfa(SQLModel, table=True):
    """TOTP second factor for staff. One row per user; deleting the row IS the MFA reset.
    Kept off the User table on purpose so secrets can never leak through a User serialisation."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False, index=True))
    secret_encrypted: Optional[str] = None          # active secret (Fernet). None until enrolment completes.
    pending_secret_encrypted: Optional[str] = None  # shown during setup; not active until a code confirms it
    enrolled_at: Optional[datetime] = None
    last_step: int = 0                              # last accepted TOTP time step (blocks replaying a code)
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    recovery_hashes_json: str = "[]"                # SHA-256 of each unused recovery code
    elevation_revoked_at: Optional[datetime] = None  # elevated sessions issued before this are dead