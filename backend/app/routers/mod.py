"""Moderation API. Every route requires a moderator or admin (router-level dependency).

RULES FOR FUTURE CHANGES
- A new route here is protected automatically. Admin-only? add Depends(require_admin_role).
- Anything that changes state MUST call record() so it lands in the audit log.
- Never return a User/Profile model directly (tokens live on User); build explicit dicts.
"""
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.auth.dependencies import require_admin_role, require_moderator
from app.database import get_session
from app.models.leetcode import LeetcodeStats
from app.models.moderation import ModerationLog, Report
from app.models.profile import Profile
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserInterest
from app.models.user import User
from app.moderation import (
    ADMIN_MAX_SUSPENSION_DAYS,
    MOD_MAX_SUSPENSION_DAYS,
    ROLE_ADMIN,
    ROLE_MODERATOR,
    ROLE_USER,
    effective_role,
    is_suspended,
    record,
)

router = APIRouter(prefix="/mod", tags=["moderation"], dependencies=[Depends(require_moderator)])

TAG_CATEGORIES = ("stack", "interest")
LOG_PAGE_SIZE = 50


# ---------- request bodies ----------

class SuspendBody(BaseModel):
    reason: str
    days: int | None = None  # None = until lifted (admin only)


class NoteBody(BaseModel):
    note: str


class DismissBody(BaseModel):
    note: str | None = None


class TagNamesBody(BaseModel):
    names: list[str]
    category: str


class TeamBody(BaseModel):
    username: str


# ---------- helpers ----------

def _iso(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


def _card(user: User) -> dict:
    suspended = is_suspended(user)
    return {
        "id": user.id,
        "username": user.github_username,
        "display_name": user.display_name,
        "role": effective_role(user),
        "suspended": suspended,
        "suspended_until": _iso(user.suspended_until) if suspended else None,
        "suspension_reason": user.suspension_reason if suspended else None,
    }


def _users_by_id(db: Session, ids: list[int | None]) -> dict[int, User]:
    wanted = list({i for i in ids if i is not None})
    if not wanted:
        return {}
    return {u.id: u for u in db.exec(select(User).where(User.id.in_(wanted))).all()}


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _check_can_act_on(staff: User, target: User) -> None:
    if target.id == staff.id:
        raise HTTPException(status_code=400, detail="You can't moderate yourself.")
    target_role = effective_role(target)
    if target_role == ROLE_ADMIN or (target_role == ROLE_MODERATOR and effective_role(staff) != ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="You can't moderate this account.")


def _open_reports(db: Session, target_id: int) -> list[Report]:
    return list(db.exec(select(Report).where(Report.target_user_id == target_id, Report.status == "open")).all())


def _close_reports(db: Session, reports: list[Report], staff: User, status: str, note: str | None = None) -> None:
    now = datetime.utcnow()
    for report in reports:
        report.status = status
        report.handled_by_user_id = staff.id
        report.handled_at = now
        report.resolution_note = note
        db.add(report)


def _tag_names(db: Session, link_model, user_id: int) -> list[str]:
    return list(db.exec(
        select(Tag.name).join(link_model, link_model.tag_id == Tag.id).where(link_model.user_id == user_id)
    ).all())


def _log_entry(entry: ModerationLog) -> dict:
    return {
        "id": entry.id,
        "at": _iso(entry.created_at),
        "actor": entry.actor_username,
        "action": entry.action,
        "target": entry.target_username,
        "report_id": entry.report_id,
        "note": entry.note,
    }


# ---------- identity ----------

@router.get("/whoami")
def whoami(staff: User = Depends(require_moderator)):
    return {"username": staff.github_username, "role": effective_role(staff)}


# ---------- report queue ----------

@router.get("/queue")
def get_queue(db: Session = Depends(get_session)):
    open_reports = db.exec(select(Report).where(Report.status == "open").order_by(Report.created_at.desc())).all()
    users = _users_by_id(db, [r.target_user_id for r in open_reports] + [r.reporter_user_id for r in open_reports])

    groups: dict[int, dict] = {}
    for report in open_reports:
        target = users.get(report.target_user_id)
        if target is None:
            continue
        group = groups.setdefault(target.id, {"target": _card(target), "reports": []})
        reporter = users.get(report.reporter_user_id)
        group["reports"].append({
            "id": report.id,
            "category": report.category,
            "details": report.details,
            "reporter": reporter.github_username if reporter else "(deleted account)",
            "created_at": _iso(report.created_at),
        })

    suspended = [_card(u) for u in db.exec(select(User).where(User.suspended.is_(True))).all() if is_suspended(u)]
    return {
        "groups": sorted(groups.values(), key=lambda g: len(g["reports"]), reverse=True),
        "suspended": suspended,
    }


# ---------- users ----------

@router.get("/users")
def search_users(query: str = Query("", max_length=60), db: Session = Depends(get_session)):
    q = query.strip()
    if not q:
        return []
    conditions = [User.github_username.ilike(f"%{q}%"), User.display_name.ilike(f"%{q}%")]
    if q.isdigit():
        conditions.append(User.id == int(q))
    users = db.exec(select(User).where(or_(*conditions)).order_by(User.created_at.desc()).limit(20)).all()
    return [_card(u) for u in users]


@router.get("/users/{user_id}")
def user_detail(user_id: int, db: Session = Depends(get_session)):
    user = _get_user_or_404(db, user_id)
    profile = db.exec(select(Profile).where(Profile.user_id == user.id)).first()
    leetcode = db.exec(select(LeetcodeStats).where(LeetcodeStats.user_id == user.id)).first()

    against = db.exec(
        select(Report).where(Report.target_user_id == user.id).order_by(Report.created_at.desc()).limit(50)
    ).all()
    filed = db.exec(
        select(Report).where(Report.reporter_user_id == user.id).order_by(Report.created_at.desc()).limit(200)
    ).all()
    history = db.exec(
        select(ModerationLog).where(ModerationLog.target_user_id == user.id)
        .order_by(ModerationLog.created_at.desc()).limit(100)
    ).all()
    reporters = _users_by_id(db, [r.reporter_user_id for r in against])

    return {
        "account": {
            **_card(user),
            "github_id": user.github_id,
            "avatar_url": user.avatar_url,
            "created_at": _iso(user.created_at),
        },
        "content": {
            "bio": profile.bio if profile else None,
            "links": json.loads(profile.content_links_json) if profile else [],
            "posts": json.loads(profile.posts_json) if profile else [],
            "games": json.loads(profile.games_json) if profile else [],
            "gaming_handles": json.loads(profile.gaming_handles_json) if profile else [],
            "stack": _tag_names(db, StackTag, user.id),
            "interests": _tag_names(db, UserInterest, user.id),
            "leetcode_username": leetcode.username if leetcode else None,
        },
        "reports_against": [
            {
                "id": r.id,
                "category": r.category,
                "details": r.details,
                "status": r.status,
                "reporter": reporters[r.reporter_user_id].github_username if r.reporter_user_id in reporters else "(deleted account)",
                "created_at": _iso(r.created_at),
            }
            for r in against
        ],
        "reports_filed": {"total": len(filed), "dismissed": sum(1 for r in filed if r.status == "dismissed")},
        "history": [_log_entry(e) for e in history],
    }


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    body: SuspendBody,
    staff: User = Depends(require_moderator),
    db: Session = Depends(get_session),
):
    target = _get_user_or_404(db, user_id)
    _check_can_act_on(staff, target)

    reason = body.reason.strip()
    if not reason or len(reason) > 300:
        raise HTTPException(status_code=400, detail="A reason is required (max 300 characters).")

    is_admin = effective_role(staff) == ROLE_ADMIN
    if body.days is None:
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can suspend until lifted.")
        target.suspended_until = None
        duration = "until lifted"
    else:
        limit = ADMIN_MAX_SUSPENSION_DAYS if is_admin else MOD_MAX_SUSPENSION_DAYS
        if not 1 <= body.days <= limit:
            raise HTTPException(status_code=400, detail=f"Duration must be between 1 and {limit} days.")
        target.suspended_until = datetime.utcnow() + timedelta(days=body.days)
        duration = f"{body.days} day(s)"

    target.suspended = True
    target.suspension_reason = reason
    db.add(target)
    _close_reports(db, _open_reports(db, target.id), staff, "actioned")
    record(db, staff, "suspend", target=target, note=f"{duration}: {reason}")
    db.commit()
    return {"message": f"@{target.github_username} suspended ({duration})."}


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(
    user_id: int,
    staff: User = Depends(require_moderator),
    db: Session = Depends(get_session),
):
    target = _get_user_or_404(db, user_id)
    _check_can_act_on(staff, target)
    if not is_suspended(target):
        raise HTTPException(status_code=400, detail="This account isn't suspended.")

    target.suspended = False
    target.suspended_until = None
    target.suspension_reason = None
    db.add(target)
    record(db, staff, "unsuspend", target=target)
    db.commit()
    return {"message": f"@{target.github_username} is visible again."}


@router.post("/users/{user_id}/notes")
def add_note(
    user_id: int,
    body: NoteBody,
    staff: User = Depends(require_moderator),
    db: Session = Depends(get_session),
):
    target = _get_user_or_404(db, user_id)
    note = body.note.strip()
    if not note or len(note) > 500:
        raise HTTPException(status_code=400, detail="Note must be 1-500 characters.")
    record(db, staff, "note", target=target, note=note)
    db.commit()
    return {"message": "Note added."}


@router.post("/users/{user_id}/dismiss-reports")
def dismiss_reports(
    user_id: int,
    body: DismissBody,
    staff: User = Depends(require_moderator),
    db: Session = Depends(get_session),
):
    target = _get_user_or_404(db, user_id)
    open_reports = _open_reports(db, target.id)
    if not open_reports:
        raise HTTPException(status_code=400, detail="No open reports for this user.")
    note = (body.note or "").strip() or None
    _close_reports(db, open_reports, staff, "dismissed", note)
    record(db, staff, "report_dismiss", target=target, note=f"{len(open_reports)} report(s)" + (f": {note}" if note else ""))
    db.commit()
    return {"message": f"Dismissed {len(open_reports)} report(s)."}


@router.post("/reports/{report_id}/dismiss")
def dismiss_report(
    report_id: int,
    body: DismissBody,
    staff: User = Depends(require_moderator),
    db: Session = Depends(get_session),
):
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != "open":
        raise HTTPException(status_code=400, detail="This report was already handled.")
    note = (body.note or "").strip() or None
    _close_reports(db, [report], staff, "dismissed", note)
    record(db, staff, "report_dismiss", target=db.get(User, report.target_user_id), report_id=report.id, note=note)
    db.commit()
    return {"message": "Report dismissed."}


# ---------- tags (replaces the old /admin routes and the seed script) ----------

@router.get("/tags")
def list_approved_tags(
    category: str = Query(...),
    q: str = Query("", max_length=40),
    db: Session = Depends(get_session),
):
    if category not in TAG_CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown category.")
    query = select(Tag).where(Tag.category == category, Tag.status == "approved").order_by(Tag.name).limit(100)
    if q.strip():
        query = query.where(Tag.name.ilike(f"%{q.strip()}%"))
    return [{"id": t.id, "name": t.name} for t in db.exec(query).all()]


@router.get("/tags/pending")
def list_pending_tags(db: Session = Depends(get_session)):
    tags = db.exec(select(Tag).where(Tag.status == "pending").order_by(Tag.created_at)).all()
    submitters = _users_by_id(db, [t.submitted_by_user_id for t in tags])
    return [
        {
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "submitted_by": submitters[t.submitted_by_user_id].github_username if t.submitted_by_user_id in submitters else None,
            "created_at": _iso(t.created_at),
        }
        for t in tags
    ]


@router.post("/tags/{tag_id}/approve")
def approve_tag(tag_id: int, staff: User = Depends(require_moderator), db: Session = Depends(get_session)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.status != "pending":
        raise HTTPException(status_code=400, detail="Tag is not pending.")
    tag.status = "approved"
    db.add(tag)
    record(db, staff, "tag_approve", note=f"{tag.category}: {tag.name}")
    db.commit()
    return {"message": f"Approved '{tag.name}'."}


@router.delete("/tags/{tag_id}")
def reject_tag(tag_id: int, staff: User = Depends(require_moderator), db: Session = Depends(get_session)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending tags can be rejected (approved tags are in use).")
    record(db, staff, "tag_reject", note=f"{tag.category}: {tag.name}")
    db.delete(tag)
    db.commit()
    return {"message": f"Rejected '{tag.name}'."}


@router.post("/tags")
def add_tags(body: TagNamesBody, staff: User = Depends(require_moderator), db: Session = Depends(get_session)):
    """Add approved tags directly (single or bulk). A matching pending tag is approved instead."""
    if body.category not in TAG_CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown category.")

    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in body.names:
        name = raw.strip()
        if not name:
            continue
        if len(name) > 40:
            raise HTTPException(status_code=400, detail=f"'{name[:20]}…' is longer than 40 characters.")
        if name.lower() not in seen:
            seen.add(name.lower())
            cleaned.append(name)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Enter at least one tag name.")
    if len(cleaned) > 100:
        raise HTTPException(status_code=400, detail="Add at most 100 tags at a time.")

    added: list[str] = []
    skipped: list[str] = []
    for name in cleaned:
        existing = db.exec(
            select(Tag).where(Tag.category == body.category, func.lower(Tag.name) == name.lower())
        ).first()
        if existing and existing.status == "approved":
            skipped.append(name)
            continue
        if existing:  # pending -> approve
            existing.status = "approved"
            db.add(existing)
        else:
            db.add(Tag(name=name, category=body.category, status="approved", submitted_by_user_id=staff.id))
        added.append(name)

    if added:
        record(db, staff, "tag_add", note=f"{body.category}: {', '.join(added)}")
    db.commit()
    return {"added": added, "skipped": skipped}


# ---------- audit log ----------

@router.get("/log")
def audit_log(
    actor: str | None = Query(None, max_length=60),
    target: str | None = Query(None, max_length=60),
    action: str | None = Query(None, max_length=30),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_session),
):
    query = select(ModerationLog).order_by(ModerationLog.created_at.desc(), ModerationLog.id.desc())
    if actor:
        query = query.where(func.lower(ModerationLog.actor_username) == actor.strip().lower())
    if target:
        query = query.where(func.lower(ModerationLog.target_username) == target.strip().lower())
    if action:
        query = query.where(ModerationLog.action == action)
    rows = db.exec(query.offset((page - 1) * LOG_PAGE_SIZE).limit(LOG_PAGE_SIZE + 1)).all()
    return {
        "items": [_log_entry(e) for e in rows[:LOG_PAGE_SIZE]],
        "page": page,
        "has_more": len(rows) > LOG_PAGE_SIZE,
    }


# ---------- team (admin only) ----------

@router.get("/team")
def list_team(admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    moderators = db.exec(select(User).where(User.role == ROLE_MODERATOR).order_by(User.github_username)).all()
    return {"moderators": [_card(u) for u in moderators]}


@router.post("/team")
def grant_moderator(body: TeamBody, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    username = body.username.strip().lower()
    target = db.exec(select(User).where(func.lower(User.github_username) == username)).first()
    if target is None:
        raise HTTPException(status_code=404, detail="No such user. They must sign in to DevAtlas once first.")
    if effective_role(target) != ROLE_USER:
        raise HTTPException(status_code=400, detail="This account is already staff.")
    target.role = ROLE_MODERATOR
    db.add(target)
    record(db, admin, "role_grant", target=target, note=ROLE_MODERATOR)
    db.commit()
    return {"message": f"@{target.github_username} is now a moderator."}


@router.delete("/team/{user_id}")
def revoke_moderator(user_id: int, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    target = _get_user_or_404(db, user_id)
    if target.role != ROLE_MODERATOR or effective_role(target) == ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="This account isn't a moderator.")
    target.role = ROLE_USER
    db.add(target)
    record(db, admin, "role_revoke", target=target)
    db.commit()
    return {"message": f"@{target.github_username} is no longer a moderator."}