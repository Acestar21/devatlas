import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def notify_staff(message: str) -> None:
    """Post to the staff Discord channel. Best-effort: never raises, no-op if unconfigured.
    Only put server-controlled text in `message` (usernames are fine, free-text user input is not)."""
    if not settings.mod_webhook_url:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                settings.mod_webhook_url,
                json={"content": message[:1900], "allowed_mentions": {"parse": []}},
            )
    except httpx.HTTPError:
        logger.warning("Staff webhook failed", exc_info=True)