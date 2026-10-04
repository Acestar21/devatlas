# Moderation: how it works

Code: `app/moderation.py` (rules), `app/routers/mod.py` (staff API), `app/routers/reports.py` (user reports).

## Roles
| Role | Can do |
|---|---|
| user | file reports |
| moderator | everything under /mod except Team; suspend up to 30 days |
| admin | everything; suspend until lifted (or up to 365 days); grant/revoke moderators |

The account whose GitHub id == `ADMIN_GITHUB_ID` is always admin (break-glass).
Non-staff get a 404 from every /mod route: the panel doesn't exist for them.

## Suspension
- Hidden from everyone except the owner and staff; public sees a normal 404.
- The owner can still log in and edit (they have to fix the issue) but can't delete the account.
- `suspended_until = NULL` with `suspended = true` means "until a moderator lifts it".
- Expiry is checked on read (`is_suspended()`); there is no cron job.

## Adding a new public surface that shows user content?
Enforce visibility there too: see the checklist at the top of `app/moderation.py`.

## Adding a new moderation action?
Call `record(db, actor, "action_name", ...)` in the same transaction and add the name to `ACTIONS`.

## Adding a table that references `user.id`?
Give the FK an explicit `ondelete` (see `_user_fk` in `models/moderation.py`) so account deletion never breaks.

## Audit log
Append-only `moderationlog`; usernames are snapshotted. Never update or delete rows.

## MFA (staff only)
- Staff sign in with GitHub, then enter an authenticator (TOTP) code at `/mod/mfa` -> 30-minute elevated session.
- Elevation is an `mfa_at` timestamp inside the signed session token. `require_moderator` (auth/dependencies.py)
  checks role + a fresh `mfa_at` on every /mod request; logging in again drops elevation.
- 5 wrong codes -> 15-minute lockout. Each TOTP code works once. 8 one-time recovery codes at enrolment.
- Enrolment is self-service; every enrolment pings the staff Discord channel so the admin can sanity-check it.
  (Future: admin-issued enrolment codes would close the "hijacked GitHub account enrols first" gap.)
- Lost device: admin resets a moderator via DELETE /mod/team/{id}/mfa. Admin's own: `python -m app.scripts.reset_mfa <username>`.

## Personal data we keep on purpose
Reporter GitHub id/username on reports (cleared 180 days after closing) and the target's GitHub id on
suspension log entries (cleared after 365 days). Purpose: stop delete-and-re-signup abuse. Keep the privacy text in sync.