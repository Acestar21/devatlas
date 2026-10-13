from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.rate_limit import limiter
from app.routers import auth, profiles, profile_tags, badge, tags, directory, leetcode, account, reports, mod, mfa, games, journal
from app.config import settings
from fastapi import Request
from app.config import settings
from app.rate_limit import client_key, forwarded_client_ip

app = FastAPI(title="DevCard")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
@app.get("/_debug/ip", include_in_schema=False)
def debug_ip(request: Request):
    return {
        "xff_raw": request.headers.get("x-forwarded-for"),
        "x_real_ip": request.headers.get("x-real-ip"),
        "client": request.client.host if request.client else None,
        "hops": settings.trusted_proxy_hops,
        "forwarded_client_ip": forwarded_client_ip(request),
        "key": client_key(request),
    }

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"ok": True}

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(badge.router)
app.include_router(tags.router)
app.include_router(profile_tags.router)
app.include_router(directory.router)
app.include_router(leetcode.router)
app.include_router(account.router)
app.include_router(reports.router)
app.include_router(mod.router)
app.include_router(mfa.router)
app.include_router(games.router)
app.include_router(journal.router)
