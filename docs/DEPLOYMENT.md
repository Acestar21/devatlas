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
- Lost admin MFA: `python -m app.scripts.reset_mfa <username>` from a machine that can reach the database.# Deployment

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