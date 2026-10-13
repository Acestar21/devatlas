# Deployment

## GitHub OAuth App
Homepage: your site URL. Authorization callback URL: `https://YOUR-SITE/api/auth/callback` (it points at the frontend, not the API).

## Environment variables

**Backend (Render)**

| Variable | Notes |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL. The project uses psycopg 3: `postgresql+psycopg://...` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | From the OAuth app |
| `GITHUB_OAUTH_CALLBACK_URL` | `https://YOUR-SITE/api/auth/callback` |
| `SECRET_KEY` | Signs session tokens. Changing it logs everyone out. |
| `FERNET_KEY` | Encrypts GitHub tokens and MFA secrets. **Losing it makes stored tokens and MFA unreadable.** |
| `INTERNAL_API_SECRET` | Must be identical on Vercel |
| `CORS_ORIGINS`, `FRONTEND_URL` | Your site URL |
| `ADMIN_GITHUB_ID` | Numeric GitHub ID of the owner; always admin |
| `MOD_WEBHOOK_URL` | Optional Discord webhook for staff alerts. Use a private channel. |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Optional: IGDB game search and artwork (see "IGDB" below) |
| `TRUSTED_PROXY_HOPS` | Optional, default 0. Set to `1` only if the spoof test below shows `X-Forwarded-For` can be forged |

**Frontend (Vercel)**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | The API's public URL |
| `NEXT_PUBLIC_APP_URL` | The site URL (used for link previews) |
| `INTERNAL_API_SECRET` | Same value as the backend; server-only, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APPEAL_EMAIL`, `NEXT_PUBLIC_DISCORD_INVITE_URL` | Optional; shown on suspension banners and the rules page. `NEXT_PUBLIC_*` changes need a redeploy. |

## Releasing
1. Back up first (for example a Neon branch of production).
2. Apply migrations **before** the new backend code goes live: `alembic upgrade head`.
3. Deploy the backend, then the frontend.
4. Smoke test: sign in, view a profile, `/directory`, `/health`.

## First-time setup
1. Sign in once with the owner account (it becomes admin through `ADMIN_GITHUB_ID`).
2. Open `/mod/mfa`, set up your authenticator, and **save the recovery codes**.
3. Add moderators in `/mod/team`; each signs in once, then sets up MFA at `/mod/mfa`.

## Operations
- Health check: `GET /health`
- Check database size periodically in the Neon dashboard.
- Lost admin MFA: `python -m app.scripts.reset_mfa <username>` from a machine that can reach the database.

## Render start command
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
```
`--proxy-headers` makes uvicorn read the forwarded client address. Requests from the Next.js server are keyed
by the signed IP it forwards, so this mostly matters for direct calls such as `/badge/*`.

**Test whether `X-Forwarded-For` can be spoofed** (the badge limit is 600/minute, so send more than that):
```bash
for i in $(seq 1 700); do curl -s -o /dev/null -w "%{http_code} " -H "X-Forwarded-For: 10.0.0.$i" https://YOUR-API/badge/x; done
```
If you never see a `429`, each fake address got its own bucket, so the header is forgeable. Set
`TRUSTED_PROXY_HOPS=1` on Render and run it again; you should now see `429`s.

## IGDB game search (optional)
1. Create an application at https://dev.twitch.tv/console (the Twitch account needs two-factor auth).
   Category "Application Integration", client type "Confidential". The OAuth redirect URL is not used by IGDB's
   client-credentials flow, but Twitch requires an `https` one: use your site URL.
2. Copy the Client ID, generate a Client Secret, and set `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` on Render.
3. Redeploy. In the profile editor, type 2+ letters in "Game": results with artwork appear. Pick one, then choose
   an image under "Choose artwork" or paste a specific IGDB image id.
Without the variables the editor silently uses the bundled Steam list. IGDB cannot be tested over plain `http`.

## Cold starts
Don't run a 24/7 keep-alive ping on Render's free plan: it uses almost all of the 750 monthly free hours. Before a
launch or announcement, start a cron-job.org ping of `/health` (every 10 minutes) about 15 minutes ahead, and stop
it afterwards.

