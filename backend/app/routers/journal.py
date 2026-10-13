"""Temporary Journal API. Rules live in app/services/journal.py; this file is thin glue.

  GET    /journal            public feed of ACTIVE entries from non-suspended users
  POST   /journal            post an entry (signed in; max 2 active)
  DELETE /journal/{id}       end an entry early (its owner, or staff)
Each profile's own active entries ride along in GET /profiles/{username} ("journal").
"""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, not_
from sqlmodel import Session, select

from app.auth.dependencies import require_current_user
from app.database import get_session
from app.models.journal import JournalEntry
from app.models.user import User
from app.moderation import is_staff, is_suspended, record, suspension_active_clause
from app.rate_limit import limiter
from app.schemas.profile import JournalEntryOut
from app.services import journal as rules
from app.time import iso_utc

router = APIRouter(prefix="/journal", tags=["journal"])

PAGE_SIZE = 20

Genre = Literal["building", "learning", "shipped", "reading", "gaming", "life", "event", "thoughts"]


class NewEntry(BaseModel):
    body: str
    genre: Optional[Genre] = None  # optional: posting never requires a category


def _out(entry: JournalEntry) -> dict:
    return {
        "id": entry.id, "body": entry.body, "genre": entry.genre,
        "created_at": iso_utc(entry.created_at), "expires_at": iso_utc(entry.expires_at),
    }


@router.get("")
@limiter.limit("60/minute")
def feed(
    request: Request,
    genre: Optional[Genre] = Query(None),
    page: int = Query(1, ge=1, le=100),
    db: Session = Depends(get_session),
):
    base = (
        select(JournalEntry, User)
        .join(User, User.id == JournalEntry.user_id)
        .where(rules.active_clause(), not_(suspension_active_clause()))
    )
    if genre:
        base = base.where(JournalEntry.genre == genre)

    total = db.exec(select(func.count()).select_from(base.subquery())).one()
    rows = db.exec(
        base.order_by(JournalEntry.created_at.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    ).all()
    return {
        "page": page,
        "total": total,
        "total_pages": max(1, -(-total // PAGE_SIZE)),
        "results": [
            {**_out(entry), "username": user.github_username,
             "display_name": user.display_name, "avatar_url": user.avatar_url}
            for entry, user in rows
        ],
    }


@router.post("", response_model=JournalEntryOut, status_code=201)
@limiter.limit("20/hour")
def post_entry(
    request: Request,
    payload: NewEntry,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    if is_suspended(current_user):
        raise HTTPException(status_code=403, detail="Your account is suspended.")
    try:
        entry = rules.create_entry(db, current_user, payload.body, payload.genre)
    except rules.JournalError as error:
        # 409 for the slot limit so the UI can tell it apart from a plain validation error
        status = 409 if "active entries" in str(error) else 400
        raise HTTPException(status_code=status, detail=str(error))
    return _out(entry)


@router.delete("/{entry_id}", status_code=204)
@limiter.limit("60/hour")
def end_entry(
    request: Request,
    entry_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    entry = db.get(JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    is_owner = entry.user_id == current_user.id
    if not is_owner and not is_staff(current_user):
        # same answer as "doesn't exist": don't confirm other people's entry ids
        raise HTTPException(status_code=404, detail="Entry not found")
    if not is_owner and entry.ended_at is None:
        target = db.get(User, entry.user_id)
        record(db, current_user, "journal_remove", target=target, note=entry.body[:200])
    rules.end_entry(db, entry)
