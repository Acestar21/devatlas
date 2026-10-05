# Architecture

## Request flow

```
Browser ──► Vercel (Next.js)
             ├─ server components ──► backendFetch()      adds the session cookie + the visitor's
             │                                            HMAC-signed IP
             ├─ /api/proxy/*  (browser mutations) ───────► backendFetch()
             ├─ /api/auth/callback, /api/mfa/*  ─────────► backendFetch({ internal: true })
             │                                            also sends the raw INTERNAL_API_SECRET
             └─ cookie devcard_session (httpOnly)
                                  ▼
                   Render (FastAPI) ──► Neon (PostgreSQL)
                                  └──► GitHub API (GraphQL stats + REST public events)
```

Only server-side code talks to the API with the session cookie. Client components go through `/api/proxy/*`.
The raw internal secret is sent by exactly two places (the OAuth callback and `/api/mfa/*`), never by the generic proxy.

## Auth

1. `/auth/github/login` (backend) redirects to GitHub with a random `state`.
2. GitHub redirects to `/api/auth/callback` on the frontend, which calls `POST /auth/github/internal/exchange` with the internal secret.
3. The backend exchanges the code, applies the 30-day account-age rule for new signups, and returns a signed session token (itsdangerous, 14 days, claims: `user_id`, optional `mfa_at`).
4. The frontend stores it in an httpOnly cookie on its own domain.

The GitHub token is stored Fernet-encrypted and is only used to refresh stats and to revoke the grant on account deletion.

## Visibility: enforced on the server

Section toggles and card toggles are applied in `routers/profiles.py` when the payload is built; hidden data is not sent to non-owners.
Suspended profiles 404 for everyone except the owner and staff. Checklist for new public surfaces: top of `backend/app/moderation.py`.

## Rate limiting

slowapi, in memory, keyed by visitor IP. Server-side Next.js calls would otherwise all look like Vercel's IPs, so Next forwards the visitor IP with an HMAC signature (`X-Client-IP`, `X-Client-IP-Signature`); `backend/app/rate_limit.py` trusts it only when the signature verifies. Assumption to re-check if you change host: Vercel sets `x-real-ip` / `x-forwarded-for` itself.

## Data

| Table | Purpose |
|---|---|
| `user`, `profile` | Identity; profile content (links, posts, games, visibility) stored as JSON columns |
| `githubstatscache` | Cached GitHub stats (calendar, pinned repos, languages, events) |
| `tag`, `stacktag`, `userinterest` | Shared tag vocabulary and who uses it |
| `leetcodestats` | Self-reported counts |
| `report`, `moderationlog`, `staffmfa` | Moderation (see MODERATION.md) |

Rule: any new table referencing `user.id` needs an explicit `ondelete` (see `_user_fk` in `models/moderation.py`) so account deletion can't break.
GitHub stats refresh on view when older than 6 hours (`services/github.py`); the directory never triggers a live fetch.

## Known limitations

- Free-tier Render sleeps after 15 minutes idle (about a minute to wake); the app shows a loader with a mini-game, and error.tsx handles real failures.
- Rate-limit counters are per process. Run more than one backend instance and you need a shared store (Redis) in `rate_limit.py`.
- The stats cache stores a year of daily counts per user (~12 KB each before compression). Fine for thousands of users; revisit at tens of thousands.
- No email notifications; staff alerts go to a Discord webhook.
- Free-tier hosting: cold starts after idle (a `/health` ping helps).