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