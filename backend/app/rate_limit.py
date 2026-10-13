"""Rate limiting.

WHY THIS ISN'T A ONE-LINER
Browsers don't call our API for page loads: Vercel's Next.js server does, on the visitor's
behalf. To the API every such request comes from one of Vercel's IPs, so a plain IP-based
limiter would count ALL visitors together and start blocking people during a traffic spike.

THE FIX
The Next.js server (frontend/src/lib/backend.ts) forwards the visitor's real IP in X-Client-IP
plus X-Client-IP-Signature = HMAC-SHA256(INTERNAL_API_SECRET, ip). We only trust the IP when the
signature verifies, so nobody can spoof it to dodge a limit. Requests without a valid signature
(direct browser calls like /badge/* and /auth/github/login) are keyed by their own socket address.

NOTE: slowapi stores counters in memory, per process. That's right for ONE backend instance.
If you ever run several, pass storage_uri (e.g. Redis) to Limiter() below.
"""
import hashlib
import hmac
import ipaddress

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import settings

CLIENT_IP_HEADER = "x-client-ip"
CLIENT_IP_SIGNATURE_HEADER = "x-client-ip-signature"


def signed_client_ip(request: Request) -> str | None:
    """The visitor IP forwarded by our own Next.js server, or None if absent/forged."""
    ip = (request.headers.get(CLIENT_IP_HEADER) or "").strip()
    signature = request.headers.get(CLIENT_IP_SIGNATURE_HEADER) or ""
    secret = settings.internal_api_secret
    if not ip or not signature or not secret:
        return None
    expected = hmac.new(secret.encode(), ip.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature.encode(), expected.encode()):
        return None
    try:
        return str(ipaddress.ip_address(ip))
    except ValueError:
        return None


def forwarded_client_ip(request: Request) -> str | None:
    """Client IP from X-Forwarded-For, counting back from the RIGHT by settings.trusted_proxy_hops.

    Clients can put anything on the left of that header; only the entries our own proxies appended
    (the right end) can be trusted. Off (None) unless TRUSTED_PROXY_HOPS is set.
    """
    hops = settings.trusted_proxy_hops
    if hops <= 0:
        return None
    parts = [p.strip() for p in (request.headers.get("x-forwarded-for") or "").split(",") if p.strip()]
    if len(parts) < hops:
        return None
    try:
        return str(ipaddress.ip_address(parts[-hops]))
    except ValueError:
        return None


def client_key(request: Request) -> str:
    return signed_client_ip(request) or forwarded_client_ip(request) or get_remote_address(request)


limiter = Limiter(key_func=client_key)
