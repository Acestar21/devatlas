"""IGDB-backed game search for the profile editor.

Needs TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET. Without them this returns []
and the frontend falls back to its bundled list. Only name + image URLs are
returned; images are always https://images.igdb.com/... (the Game schema
rejects any other host).
"""
import time

import httpx
from fastapi import APIRouter, Depends, Query, Request

from app.auth.dependencies import require_current_user
from app.config import settings
from app.models.user import User
from app.rate_limit import limiter

router = APIRouter(prefix="/games", tags=["games"])

_token: dict = {"value": None, "expires": 0.0}


async def _app_token(client: httpx.AsyncClient) -> str | None:
    if _token["value"] and time.time() < _token["expires"] - 60:
        return _token["value"]
    response = await client.post(
        "https://id.twitch.tv/oauth2/token",
        params={
            "client_id": settings.twitch_client_id,
            "client_secret": settings.twitch_client_secret,
            "grant_type": "client_credentials",
        },
    )
    if response.status_code != 200:
        return None
    data = response.json()
    _token["value"] = data["access_token"]
    _token["expires"] = time.time() + float(data.get("expires_in", 0))
    return _token["value"]


def _image(image_id: str) -> str:
    # t_screenshot_big = 889x500, matches the landscape tiles
    return f"https://images.igdb.com/igdb/image/upload/t_screenshot_big/{image_id}.jpg"


@router.get("/search")
@limiter.limit("30/minute")
async def search_games(
    request: Request,
    q: str = Query(min_length=2, max_length=60),
    _user: User = Depends(require_current_user),  # logged-in owners only: protects our IGDB quota
):
    if not (settings.twitch_client_id and settings.twitch_client_secret):
        return []
    safe = q.replace("\\", " ").replace('"', " ").strip()
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            token = await _app_token(client)
            if not token:
                return []
            response = await client.post(
                "https://api.igdb.com/v4/games",
                headers={"Client-ID": settings.twitch_client_id, "Authorization": f"Bearer {token}"},
                content=(
                    f'search "{safe}"; '
                    "fields name,cover.image_id,artworks.image_id,screenshots.image_id; limit 8;"
                ),
            )
        if response.status_code != 200:
            return []
        hits = []
        for game in response.json():
            art = (game.get("artworks") or game.get("screenshots") or [None])[0] or game.get("cover")
            hits.append(
                {
                    "igdb_id": game["id"],
                    "name": game["name"][:60],
                    "art": _image(art["image_id"]) if art and art.get("image_id") else None,
                }
            )
        return hits
    except httpx.HTTPError:
        return []
