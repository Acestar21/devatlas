"""Moderation API. Every route requires a moderator or admin with a fresh MFA-elevated session
(router-level dependency).

RULES FOR FUTURE CHANGES
- A new route here is protected automatically. Admin-only? add Depends(require_admin_role).
- Anything that changes state MUST call record() so it lands in the audit log.
- Never return a User/Profile model directly (tokens live on User); build explicit dicts.
"""
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.auth.dependencies import require_admin_role, require_moderator
from app.database import get_session
from app.models.leetcode import LeetcodeStats
from app.models.moderation import ModerationLog, Report
from app.models.profile import Profile
from app.models.staff_mfa import StaffMfa
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserInterest
from app.models.user import User
from app.moderation import (
    ADMIN_MAX_SUSPENSION_DAYS,
    MOD_MAX_SUSPENSION_DAYS,
    ROLE_ADMIN,
    ROLE_MODERATOR,
    ROLE_USER,
    ADMIN_ONLY_ACTIONS,
    STAFF_ROLES,
    assigned_role,
    effective_role,
    is_suspended,
    purge_expired_personal_data,
    record,
)
from app.services.notify import notify_staff
from app.time import iso_utc

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

class MergeBody(BaseModel):
    keep_id: int
    remove_ids: list[int]

# ---------- helpers ----------

def _iso(value: datetime | None) -> str | None:
    return iso_utc(value)


def _card(user: User) -> dict:
    suspended = is_suspended(user)
    return {
        "id": user.id,
        "username": user.github_username,
        "display_name": user.display_name,
        "role": assigned_role(user),  # the rank, ignoring suspension; the UI uses it to decide who outranks whom
        "suspended": suspended,
        "suspended_until": _iso(user.suspended_until) if suspended else None,
        "suspension_reason": user.suspension_reason if suspended else None,
    }


def _users_by_id(db: Session, ids: list[int | None]) -> dict[int, User]:
    wanted = list({i for i in ids if i is not None})
    if not wanted:
        return {}
    return {u.id: u for u in db.exec(select(User).where(User.id.in_(wanted))).all()}


def _users_by_github_id(db: Session, github_ids) -> dict[int, User]:
    wanted = list({g for g in github_ids if g is not None})
    if not wanted:
        return {}
    return {u.github_id: u for u in db.exec(select(User).where(User.github_id.in_(wanted))).all()}


def _reporter_history(db: Session, github_ids) -> dict[int, dict]:
    """How many reports each reporter has filed / had dismissed, matched by GitHub id so the
    numbers survive deleting the account and signing up again."""
    wanted = list({g for g in github_ids if g is not None})
    stats = {g: {"total": 0, "dismissed": 0} for g in wanted}
    if not wanted:
        return stats
    rows = db.exec(select(Report.reporter_github_id, Report.status).where(Report.reporter_github_id.in_(wanted))).all()
    for github_id, status in rows:
        stats[github_id]["total"] += 1
        if status == "dismissed":
            stats[github_id]["dismissed"] += 1
    return stats


def _reporter_info(report: Report, current_by_github_id: dict[int, User], history: dict[int, dict]) -> dict:
    """Who filed this report. state: active | deleted | re-registered | purged."""
    github_id = report.reporter_github_id
    if github_id is None:
        return {"username": "(identity purged)", "github_id": None, "account_id": None, "state": "purged", "filed": None, "dismissed": None}
    current = current_by_github_id.get(github_id)
    if current is None:
        state = "deleted"
    elif current.id == report.reporter_user_id:
        state = "active"
    else:
        state = "re-registered"  # same GitHub account, new DevAtlas account
    counts = history.get(github_id, {"total": 0, "dismissed": 0})
    return {
        "username": current.github_username if current else report.reporter_username,
        "github_id": github_id,
        "account_id": current.id if current else None,
        "state": state,
        "filed": counts["total"],
        "dismissed": counts["dismissed"],
    }


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _check_can_act_on(staff: User, target: User) -> None:
    if target.id == staff.id:
        raise HTTPException(status_code=400, detail="You can't moderate yourself.")
    target_rank = assigned_role(target)  # rank survives suspension: a suspended moderator still outranks moderators
    if target_rank == ROLE_ADMIN or (target_rank == ROLE_MODERATOR and effective_role(staff) != ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="You can't moderate this account.")


def _open_reports(db: Session, target_id: int) -> list[Report]:
    return list(db.exec(select(Report).where(Report.target_user_id == target_id, Report.status == "open")).all())


def _close_reports(db: Session, reports: list[Report], staff: User, status: str, note: str | None = None) -> None:
    now = datetime.now(timezone.utc)
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
        "target_github_id": entry.target_github_id,
        "report_id": entry.report_id,
        "note": entry.note,
    }

def _check_can_handle_reports(staff: User, target: User) -> None:
    """Reports about staff are handled by an admin only, so nobody can clear reports about themselves.
    The admin is the exception (nobody ranks above them); the audit log records it."""
    if assigned_role(target) in STAFF_ROLES and effective_role(staff) != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Only an admin can handle reports about staff.")


def _tag_use_counts(db: Session) -> dict[int, int]:
    counts: dict[int, int] = {}
    for link_model in (StackTag, UserInterest):
        for tag_id, n in db.exec(select(link_model.tag_id, func.count()).group_by(link_model.tag_id)).all():
            counts[tag_id] = counts.get(tag_id, 0) + n
    return counts

# ---------- identity ----------

@router.get("/whoami")
def whoami(staff: User = Depends(require_moderator)):
    return {"username": staff.github_username, "role": effective_role(staff)}


# ---------- report queue ----------

@router.get("/queue")
def get_queue(db: Session = Depends(get_session)):
    purge_expired_personal_data(db)
    db.commit()

    open_reports = db.exec(select(Report).where(Report.status == "open").order_by(Report.created_at.desc())).all()
    targets = _users_by_id(db, [r.target_user_id for r in open_reports])
    reporter_ids = {r.reporter_github_id for r in open_reports}
    current_reporters = _users_by_github_id(db, reporter_ids)
    history = _reporter_history(db, reporter_ids)

    groups: dict[int, dict] = {}
    for report in open_reports:
        target = targets.get(report.target_user_id)
        if target is None:
            continue
        group = groups.setdefault(target.id, {"target": _card(target), "reports": []})
        group["reports"].append({
            "id": report.id,
            "category": report.category,
            "details": report.details,
            "reporter": _reporter_info(report, current_reporters, history),
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
def user_detail(user_id: int, db: Session = Depends(get_session), staff: User = Depends(require_moderator)):
    user = _get_user_or_404(db, user_id)
    profile = db.exec(select(Profile).where(Profile.user_id == user.id)).first()
    leetcode = db.exec(select(LeetcodeStats).where(LeetcodeStats.user_id == user.id)).first()

    against = db.exec(
        select(Report).where(Report.target_user_id == user.id).order_by(Report.created_at.desc()).limit(50)
    ).all()
    # matched by GitHub id so reports filed before a delete + re-signup still count
    filed = db.exec(
        select(Report).where(Report.reporter_github_id == user.github_id).order_by(Report.created_at.desc()).limit(200)
    ).all()
    # also matched by GitHub id: a re-registered offender still shows their earlier suspensions
    history_query = select(ModerationLog).where(
        or_(ModerationLog.target_user_id == user.id, ModerationLog.target_github_id == user.github_id)
    )
    if effective_role(staff) != ROLE_ADMIN:
        history_query = history_query.where(ModerationLog.action.not_in(ADMIN_ONLY_ACTIONS))
    history = db.exec(history_query.order_by(ModerationLog.created_at.desc()).limit(100)).all()

    against_reporter_ids = {r.reporter_github_id for r in against}
    current_reporters = _users_by_github_id(db, against_reporter_ids)
    reporter_history = _reporter_history(db, against_reporter_ids)

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
                "reporter": _reporter_info(r, current_reporters, reporter_history),
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
        target.suspended_until = datetime.now(timezone.utc) + timedelta(days=body.days)
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
    _check_can_handle_reports(staff, target)
    open_reports = _open_reports(db, target.id)
    if not open_reports:
        raise HTTPException(status_code=400, detail="No open reports for this user.")
    note = (body.note or "").strip() or None
    _close_reports(db, open_reports, staff, "dismissed", note)
    own = " (reports about themselves)" if target.id == staff.id else ""
    record(db, staff, "report_dismiss", target=target, note=f"{len(open_reports)} report(s){own}" + (f": {note}" if note else ""))
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
    target = db.get(User, report.target_user_id)
    if target is not None:
        _check_can_handle_reports(staff, target)
    note = (body.note or "").strip() or None
    _close_reports(db, [report], staff, "dismissed", note)
    record(db, staff, "report_dismiss", target=target, report_id=report.id, note=note)
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
    counts = _tag_use_counts(db)
    return [{"id": t.id, "name": t.name, "uses": counts.get(t.id, 0)} for t in db.exec(query).all()]


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

@router.get("/tags/duplicates")
def tag_duplicates(admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    """Tags whose names match ignoring case and extra spaces ('html' vs 'HTML')."""
    counts = _tag_use_counts(db)
    groups: dict[tuple[str, str], list[Tag]] = {}
    for tag in db.exec(select(Tag).where(Tag.category.in_(TAG_CATEGORIES))).all():
        groups.setdefault((tag.category, " ".join(tag.name.lower().split())), []).append(tag)
    return [
        {
            "category": category,
            "tags": [
                {"id": t.id, "name": t.name, "status": t.status, "uses": counts.get(t.id, 0)}
                for t in sorted(tags, key=lambda t: -counts.get(t.id, 0))
            ],
        }
        for (category, _), tags in groups.items()
        if len(tags) > 1
    ]


@router.post("/tags/merge")
def merge_tags(body: MergeBody, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    """Fix duplicates: move every profile using the duplicates onto the tag to keep, then delete them."""
    keep = db.get(Tag, body.keep_id)
    if keep is None or keep.category not in TAG_CATEGORIES:
        raise HTTPException(status_code=404, detail="Tag to keep not found")
    if keep.status != "approved":
        raise HTTPException(status_code=400, detail="The tag you keep must be approved.")
    remove_ids = {i for i in body.remove_ids if i != keep.id}
    if not remove_ids:
        raise HTTPException(status_code=400, detail="Pick at least one other tag to merge.")

    removed_names: list[str] = []
    moved = 0
    for tag_id in remove_ids:
        duplicate = db.get(Tag, tag_id)
        if duplicate is None or duplicate.category != keep.category:
            raise HTTPException(status_code=400, detail="Tags to merge must exist and share the category of the one you keep.")
        for link_model in (StackTag, UserInterest):
            for link in db.exec(select(link_model).where(link_model.tag_id == duplicate.id)).all():
                already_has_keep = db.exec(
                    select(link_model).where(link_model.user_id == link.user_id, link_model.tag_id == keep.id)
                ).first()
                if already_has_keep:
                    db.delete(link)  # that profile already has the tag we keep
                else:
                    link.tag_id = keep.id
                    db.add(link)
                    moved += 1
        db.flush()  # links must move before the duplicate's row can be deleted
        removed_names.append(duplicate.name)
        db.delete(duplicate)

    record(db, admin, "tag_merge", note=f"{keep.category}: kept '{keep.name}', merged {', '.join(removed_names)} ({moved} profile(s) moved)")
    db.commit()
    return {"message": f"Merged {len(removed_names)} tag(s) into '{keep.name}'."}


@router.delete("/tags/{tag_id}/purge")
def purge_tag(tag_id: int, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    """Delete a tag even if profiles use it (it disappears from all of them). For junk or offensive tags."""
    tag = db.get(Tag, tag_id)
    if tag is None or tag.category not in TAG_CATEGORIES:
        raise HTTPException(status_code=404, detail="Tag not found")
    uses = 0
    for link_model in (StackTag, UserInterest):
        links = db.exec(select(link_model).where(link_model.tag_id == tag.id)).all()
        uses += len(links)
        for link in links:
            db.delete(link)
    db.flush()
    record(db, admin, "tag_delete", note=f"{tag.category}: {tag.name} (removed from {uses} profile(s))")
    db.delete(tag)
    db.commit()
    return {"message": f"Deleted '{tag.name}' (removed from {uses} profile(s))."}

# ---------- audit log ----------

@router.get("/log")
def audit_log(
    actor: str | None = Query(None, max_length=60),
    target: str | None = Query(None, max_length=60),
    action: str | None = Query(None, max_length=30),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_session),
    staff: User = Depends(require_moderator)
):
    query = select(ModerationLog).order_by(ModerationLog.created_at.desc(), ModerationLog.id.desc())
    if effective_role(staff) != ROLE_ADMIN:
        query = query.where(ModerationLog.action.not_in(ADMIN_ONLY_ACTIONS))
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
    mfa_rows = {}
    if moderators:
        mfa_rows = {m.user_id: m for m in db.exec(select(StaffMfa).where(StaffMfa.user_id.in_([u.id for u in moderators]))).all()}
    return {
        "moderators": [
            {
                **_card(u),
                "mfa_enrolled_at": _iso(mfa_rows[u.id].enrolled_at) if u.id in mfa_rows and mfa_rows[u.id].secret_encrypted else None,
            }
            for u in moderators
        ]
    }


@router.post("/team")
def grant_moderator(body: TeamBody, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    username = body.username.strip().lower()
    target = db.exec(select(User).where(func.lower(User.github_username) == username)).first()
    if target is None:
        raise HTTPException(status_code=404, detail="No such user. They must sign in to DevAtlas once first.")
    if assigned_role(target) != ROLE_USER:
        raise HTTPException(status_code=400, detail="This account is already staff.")
    if is_suspended(target):
        raise HTTPException(status_code=400, detail="Suspended accounts can't be made moderators.")
    target.role = ROLE_MODERATOR
    db.add(target)
    record(db, admin, "role_grant", target=target, note=ROLE_MODERATOR)
    db.commit()
    return {"message": f"@{target.github_username} is now a moderator. They can set up MFA at /mod/mfa."}


@router.delete("/team/{user_id}")
def revoke_moderator(user_id: int, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    target = _get_user_or_404(db, user_id)
    if target.role != ROLE_MODERATOR or effective_role(target) == ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="This account isn't a moderator.")
    target.role = ROLE_USER
    db.add(target)
    mfa = db.exec(select(StaffMfa).where(StaffMfa.user_id == target.id)).first()
    if mfa:
        db.delete(mfa)  # a demoted user keeps no authenticator on file
    record(db, admin, "role_revoke", target=target)
    db.commit()
    return {"message": f"@{target.github_username} is no longer a moderator."}


@router.delete("/team/{user_id}/mfa")
def reset_mfa(
    user_id: int,
    background: BackgroundTasks,
    admin: User = Depends(require_admin_role),
    db: Session = Depends(get_session),
):
    """For a moderator who lost their device. Admins reset their own MFA with the CLI script."""
    target = _get_user_or_404(db, user_id)
    if effective_role(target) == ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="Admins reset MFA with: python -m app.scripts.reset_mfa <username>")
    mfa = db.exec(select(StaffMfa).where(StaffMfa.user_id == target.id)).first()
    if mfa is None:
        raise HTTPException(status_code=400, detail="This user has no MFA set up.")
    db.delete(mfa)
    record(db, admin, "mfa_reset", target=target)
    db.commit()
    background.add_task(notify_staff, f"MFA reset for @{target.github_username} by @{admin.github_username}.")
    return {"message": f"MFA reset for @{target.github_username}. They must set it up again."}


@router.post("/team/{user_id}/end-elevation")
def end_elevation(user_id: int, admin: User = Depends(require_admin_role), db: Session = Depends(get_session)):
    """Kill a moderator's current elevated session immediately."""
    target = _get_user_or_404(db, user_id)
    mfa = db.exec(select(StaffMfa).where(StaffMfa.user_id == target.id)).first()
    if mfa is None:
        raise HTTPException(status_code=400, detail="This user has no MFA session.")
    mfa.elevation_revoked_at = datetime.now(timezone.utc)
    db.add(mfa)
    record(db, admin, "elevation_end", target=target)
    db.commit()
    return {"message": f"@{target.github_username}'s elevated session was ended."}