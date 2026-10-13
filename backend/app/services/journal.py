"""Temporary Journal rules, in one place.

  * at most MAX_ACTIVE entries per user at a time
  * an entry lives LIFETIME (24h) from creation, then silently disappears
  * the owner can end an entry early; expired/ended entries free their slot immediately
  * genre is optional; when present it must be one of GENRES
Expiry is evaluated on read (no cron job), exactly like suspensions in app/moderation.py.
"""
import re
from datetime import datetime, timedelta

from sqlalchemy import and_, delete, func, text
from sqlmodel import Session, select

from app.models.journal import JournalEntry
from app.models.user import User
from app.time import utc_now

MAX_ACTIVE = 2
LIFETIME = timedelta(hours=24)
RETENTION_DAYS = 7  # ended/expired rows are hard-deleted this long after creation
MAX_BODY = 280
GENRES = ("building", "learning", "shipped", "reading", "gaming", "life", "event", "thoughts")

_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


class JournalError(Exception):
    """Raised with a user-presentable message."""


def clean_body(raw: str) -> str:
    text_ = _CONTROL.sub("", (raw or "").replace("\r\n", "\n").replace("\r", "\n")).strip()
    text_ = re.sub(r"\n{3,}", "\n\n", text_)
    if not text_:
        raise JournalError("Write something first.")
    if len(text_) > MAX_BODY:
        raise JournalError(f"Entries can be up to {MAX_BODY} characters.")
    return text_


def active_clause(now: datetime | None = None):
    """SQL for 'still live'. Use it everywhere entries are listed or counted."""
    now = now or utc_now()
    return and_(JournalEntry.ended_at.is_(None), JournalEntry.expires_at > now)


def active_entries(db: Session, user_id: int) -> list[JournalEntry]:
    return list(db.exec(
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id, active_clause())
        .order_by(JournalEntry.created_at.desc())
    ).all())


def purge_old(db: Session) -> None:
    # synchronize_session=False: let the database do the comparison. The default tries to evaluate
    # the filter in Python against loaded rows, and DB datetimes are naive while utc_now() is aware.
    db.execute(
        delete(JournalEntry)
        .where(JournalEntry.created_at < utc_now() - timedelta(days=RETENTION_DAYS))
        .execution_options(synchronize_session=False)
    )


def create_entry(db: Session, user: User, body: str, genre: str | None) -> JournalEntry:
    body = clean_body(body)
    if genre is not None and genre not in GENRES:
        raise JournalError("Unknown genre.")

    # Serialise this user's posts so two simultaneous requests can't both slip past the limit.
    # The lock is released at commit/rollback. Postgres only (tests run on SQLite).
    if db.get_bind().dialect.name == "postgresql":
        db.connection().execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": 2_000_000_000_000 + user.id}
        )

    active = db.exec(
        select(func.count()).select_from(JournalEntry)
        .where(JournalEntry.user_id == user.id, active_clause())
    ).one()
    if active >= MAX_ACTIVE:
        raise JournalError(
            f"You already have {MAX_ACTIVE} active entries. End one (or wait for it to expire) to post another."
        )

    now = utc_now()
    entry = JournalEntry(user_id=user.id, body=body, genre=genre, created_at=now, expires_at=now + LIFETIME)
    db.add(entry)
    purge_old(db)
    db.commit()
    db.refresh(entry)
    return entry


def end_entry(db: Session, entry: JournalEntry) -> None:
    """Idempotent. Frees the author's slot immediately."""
    if entry.ended_at is None:
        entry.ended_at = utc_now()
        db.add(entry)
        db.commit()
