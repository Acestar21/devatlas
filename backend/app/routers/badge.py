import json
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import func, Session, select
from sqlalchemy import func
from app.rate_limit import limiter
from app.database import get_session
from html import escape
from app.moderation import is_suspended
from app.models.user import User
from app.models.github_stats import GithubStatsCache
from app.models.profile import Profile

router = APIRouter(prefix="/badge", tags=["badges"])

# The badge is an image, never a document: forbid sniffing and any script/loading on it.
SAFE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
}


def generate_badge_svg(username: str, stats: GithubStatsCache | None) -> str:
    if not stats:
        return f'''<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" rx="10" fill="#f3f4f6" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="14">
                Stats not yet available for {escape(username)}
            </text>
        </svg>'''

    languages = json.loads(stats.top_languages_json)
    lang_text = escape(", ".join(languages[:3]) if languages else "None")
    if len(languages) > 3:
        lang_text += f" +{len(languages) - 3}"

    return f'''<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" rx="10" fill="#1a1b27" />
        <text x="20" y="30" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold">@{escape(username)}</text>
        <text x="20" y="60" fill="#9ca3af" font-family="sans-serif" font-size="12">Contributions: {stats.total_contributions}</text>
        <text x="20" y="80" fill="#9ca3af" font-family="sans-serif" font-size="12">Top: {lang_text}</text>
    </svg>'''

@router.get("/{username}")
@limiter.limit("600/minute")  # README images are fetched via GitHub's shared image proxy
def get_badge(
    request: Request,
    username: str,
    db: Session = Depends(get_session),
):
    user = db.exec(select(User).where(func.lower(User.github_username) == username.lower())).first()
    profile = (
        db.exec(select(Profile).where(Profile.user_id == user.id)).first() if user else None
    )
    # a hidden GitHub section hides the badge too, and looks exactly like "no such user"
    hidden = bool(profile) and not json.loads(profile.section_visibility_json).get("github", True)
    if not user or is_suspended(user) or hidden:
        svg_content = f'''<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" rx="10" fill="#f3f4f6" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="14">
                User "{escape(username)}" not found
            </text>
        </svg>'''
        return Response(content=svg_content, media_type="image/svg+xml", status_code=404, headers=SAFE_HEADERS)

    cache = db.exec(
        select(GithubStatsCache).where(GithubStatsCache.user_id == user.id)
    ).first()

    svg_content = generate_badge_svg(username, cache)

    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=3600", **SAFE_HEADERS}
    )
