"""IGDB-backed game search and artwork choices for the profile editor.

Needs TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET (a Twitch developer app; IGDB uses the "client
credentials" flow, so no user login is involved). Without them every endpoint returns [] / no
options and the frontend falls back to its bundled Steam list.

  GET /games/search?q=            games matching a name, each with one default image
  GET /games/{igdb_id}/images     every cover / artwork / screenshot IGDB has for that game

Only name + image ids/URLs are returned. Image URLs are always
https://images.igdb.com/igdb/image/upload/<size>/<image_id>.jpg (the Game schema rejects anything else).
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

MAX_ARTWORKS = 12
MAX_SCREENSHOTS = 12


def igdb_image_url(image_id: str, size: str = "t_720p") -> str:
    return f"https://images.igdb.com/igdb/image/upload/{size}/{image_id}.jpg"


def _configured() -> bool:
    return bool(settings.twitch_client_id and settings.twitch_client_secret)


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


async def _igdb_games(query: str) -> list[dict] | None:
    """Run one Apicalypse query against /v4/games. None = not configured / failed."""
    if not _configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            token = await _app_token(client)
            if not token:
                return None
            response = await client.post(
                "https://api.igdb.com/v4/games",
                headers={"Client-ID": settings.twitch_client_id, "Authorization": f"Bearer {token}"},
                content=query,
            )
        return response.json() if response.status_code == 200 else None
    except (httpx.HTTPError, ValueError):
        return None


@router.get("/search")
@limiter.limit("30/minute")
async def search_games(
    request: Request,
    q: str = Query(min_length=2, max_length=60),
    _user: User = Depends(require_current_user),  # logged-in owners only: protects our IGDB quota
):
    safe = q.replace("\\", " ").replace('"', " ").strip()
    games = await _igdb_games(
        f'search "{safe}"; '
        "fields name,cover.image_id,artworks.image_id,screenshots.image_id; limit 8;"
    )
    hits = []
    for game in games or []:
        art = (game.get("artworks") or game.get("screenshots") or [None])[0] or game.get("cover")
        hits.append(
            {
                "igdb_id": game["id"],
                "name": game["name"][:60],
                "art": igdb_image_url(art["image_id"]) if art and art.get("image_id") else None,
            }
        )
    return hits


@router.get("/{igdb_id}/images")
@limiter.limit("60/minute")
async def game_images(
    request: Request,
    igdb_id: int,
    _user: User = Depends(require_current_user),
):
    """Every image IGDB has for one game, so the owner can pick the one they want."""
    games = await _igdb_games(
        f"fields name,cover.image_id,artworks.image_id,screenshots.image_id; where id = {int(igdb_id)};"
    )
    if not games:
        return {"options": []}
    game = games[0]
    options: list[dict] = []

    def add(item: dict | None, kind: str, big: str, thumb: str) -> None:
        if item and item.get("image_id"):
            options.append({
                "image_id": item["image_id"],
                "kind": kind,
                "url": igdb_image_url(item["image_id"], big),
                "thumb": igdb_image_url(item["image_id"], thumb),
            })

    add(game.get("cover"), "cover", "t_cover_big_2x", "t_cover_big")
    for item in (game.get("artworks") or [])[:MAX_ARTWORKS]:
        add(item, "artwork", "t_720p", "t_screenshot_med")
    for item in (game.get("screenshots") or [])[:MAX_SCREENSHOTS]:
        add(item, "screenshot", "t_720p", "t_screenshot_med")
    return {"options": options}
