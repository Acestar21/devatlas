"""Moderation rules: the single source of truth. Read this file first.

ROLES
  user < moderator < admin, stored in User.role. Exception: the account whose GitHub id equals
  ADMIN_GITHUB_ID (env) is ALWAYS admin, so a bad DB edit can never lock the owner out.

SUSPENSION
  A suspended profile is hidden from everyone except its owner and staff. It looks exactly like a
  nonexistent profile to the public (404). Expiry is evaluated on read, with no cron job:
  User.suspended stays True after suspended_until passes and is_suspended() just returns False.

WHERE VISIBILITY IS ENFORCED (add any new public surface that exposes user content here!)
  routers/profiles.py   GET /profiles/{username}   -> can_view_profile()
  routers/directory.py  listing                      -> suspension_active_clause()
  routers/badge.py      SVG badge                    -> is_suspended()
  routers/account.py    suspended users can't delete their account (prevents evading a suspension)

AUDIT
  Every state-changing moderation action must call record(). The log is append-only.
"""
from datetime import datetime

from sqlalchemy import and_, or_
from sqlmodel import Session

from app.config import settings
from app.models.moderation import ModerationLog
from app.models.user import User

ROLE_USER = "user"
ROLE_MODERATOR = "moderator"
ROLE_ADMIN = "admin"
STAFF_ROLES = {ROLE_MODERATOR, ROLE_ADMIN}

MOD_MAX_SUSPENSION_DAYS = 30
ADMIN_MAX_SUSPENSION_DAYS = 365

# Values of ModerationLog.action
ACTIONS = (
    "suspend", "unsuspend",
    "report_dismiss", "note",
    "role_grant", "role_revoke",
    "tag_approve", "tag_reject", "tag_add",
)


def effective_role(user: User | None) -> str:
    """The role that counts. Returns 'anonymous' for no user."""
    if user is None:
        return "anonymous"
    if settings.admin_github_id and user.github_id == settings.admin_github_id:
        return ROLE_ADMIN
    return user.role or ROLE_USER


def is_staff(user: User | None) -> bool:
    return effective_role(user) in STAFF_ROLES


def is_suspended(user: User) -> bool:
    if not user.suspended:
        return False
    return user.suspended_until is None or user.suspended_until > datetime.utcnow()


def suspension_active_clause():
    """SQL twin of is_suspended(). Keep the two in sync."""
    return and_(
        User.suspended.is_(True),
        or_(User.suspended_until.is_(None), User.suspended_until > datetime.utcnow()),
    )


def can_view_profile(owner: User, viewer: User | None) -> bool:
    if not is_suspended(owner):
        return True
    return viewer is not None and (viewer.id == owner.id or is_staff(viewer))


def moderation_info(user: User) -> dict | None:
    """What the owner and staff see about an active suspension (None if not suspended)."""
    if not is_suspended(user):
        return None
    return {
        "suspended": True,
        "reason": user.suspension_reason,
        "until": user.suspended_until.isoformat() + "Z" if user.suspended_until else None,
    }


def record(
    db: Session,
    actor: User,
    action: str,
    *,
    target: User | None = None,
    report_id: int | None = None,
    note: str | None = None,
) -> None:
    """Append an audit-log row. Does NOT commit, so the caller's change and its log entry
    land in the same transaction."""
    db.add(ModerationLog(
        actor_user_id=actor.id,
        actor_username=actor.github_username,
        action=action,
        target_user_id=target.id if target else None,
        target_username=target.github_username if target else None,
        report_id=report_id,
        note=note[:1000] if note else None,
    ))