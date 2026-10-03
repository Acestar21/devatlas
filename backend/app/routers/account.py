import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, update
from sqlmodel import Session
from app.moderation import is_suspended
from app.auth.crypto import decrypt_token
from app.auth.dependencies import require_current_user
from app.config import settings
from app.database import get_session
from app.models.github_stats import GithubStatsCache
from app.models.leetcode import LeetcodeStats
from app.models.profile import Profile
from app.models.tag import Tag
from app.models.tags_relations import StackTag, UserGame, UserInterest, UserProject
from app.models.user import User

router = APIRouter(prefix="/account", tags=["account"])
logger = logging.getLogger(__name__)


async def _revoke_github_grant(user: User) -> bool:
    """Revokes DevAtlas' OAuth grant (and all its tokens) for this user on GitHub.
    True if the grant is gone (revoked now, or already revoked). False if we couldn't confirm.
    """
    if not user.encrypted_github_token:
        return True
    try:
        token = decrypt_token(user.encrypted_github_token)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(
                "DELETE",
                f"https://api.github.com/applications/{settings.github_client_id}/grant",
                auth=(settings.github_client_id, settings.github_client_secret),
                json={"access_token": token},
                headers={"Accept": "application/vnd.github+json"},
            )
    except Exception:
        logger.exception("GitHub grant revoke failed for user %s", user.id)
        return False
    # 404/422: token or grant was already revoked on GitHub's side (verify exact codes in the docs)
    return resp.status_code in (204, 404, 422)


@router.delete("")
async def delete_account(
    confirm: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_session),
):
    if confirm != current_user.github_username:
        raise HTTPException(status_code=400, detail="Type your username exactly to confirm.")
    if is_suspended(current_user):
        raise HTTPException(
            status_code=403,
            detail="Your account is suspended, so it can't be deleted right now. Contact the moderators.",
        )
    uid = current_user.id
    revoked = await _revoke_github_grant(current_user)

    # Approved tags are shared with other users: keep them, drop the submitter.
    # Pending tags can't be linked by anyone yet: delete them.
    db.execute(update(Tag).where(Tag.submitted_by_user_id == uid, Tag.status == "approved").values(submitted_by_user_id=None))
    db.execute(delete(Tag).where(Tag.submitted_by_user_id == uid, Tag.status != "approved"))

    for model in (StackTag, UserInterest, UserGame, UserProject, LeetcodeStats, GithubStatsCache, Profile):
        db.execute(delete(model).where(model.user_id == uid))
    db.execute(delete(User).where(User.id == uid))
    db.commit()

    return {"deleted": True, "github_revoked": revoked}