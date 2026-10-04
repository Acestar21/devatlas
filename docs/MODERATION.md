# Moderation

Code: `backend/app/moderation.py` (rules), `routers/mod.py` (staff API), `routers/reports.py`, `routers/mfa.py`, `auth/mfa.py`.
Panel: `frontend/src/app/mod/`.

## Roles
| Role | Can do |
|---|---|
| user | file reports |
| moderator | review reports; suspend up to 30 days; unsuspend; dismiss reports about regular users; approve/reject/add tags; notes; read the audit log (without security events) |
| admin | everything above + indefinite suspension (or up to 365 days); reports about staff; moderators (grant/revoke/reset MFA/end session); merge/delete tags; full audit log |

The account whose GitHub ID equals `ADMIN_GITHUB_ID` is always admin. Non-staff get a 404 from every `/mod` page and API route.
A suspended moderator has no powers while suspended. Moderators can't act on other moderators or admins, and nobody can suspend themselves.

## MFA
Staff sign in with GitHub, then enter an authenticator (TOTP) code at `/mod/mfa` to start a 30-minute elevated session.
- Elevation is an `mfa_at` timestamp in the signed session token. `require_moderator` checks the role (read from the DB every request) and that `mfa_at` is fresh. Signing in again drops elevation.
- 5 wrong codes lock the account for 15 minutes; each code works once; 8 one-time recovery codes are issued at enrolment.
- Enrolment is self-service and pings the Discord channel. Check the "MFA set up" date in `/mod/team` against it.
- Lost device: an admin resets a moderator (`/mod/team`). Admin: `python -m app.scripts.reset_mfa <username>`.
- Codes depend on accurate clocks. If codes only work at the end of the 30 seconds, the server or phone clock is off.

## Suspension
Hidden from everyone except the owner and staff; looks like a nonexistent profile (404). The owner sees the reason on a banner, can edit, but can't delete the account. Expiry is checked on read; there is no cron job.
Enforcement points: see the checklist at the top of `moderation.py`.

## Reports
Logged-in users can report a profile (max 5 per hour, one open report per target). The reporter's GitHub ID and username are kept so deleting and re-signing up doesn't reset limits; the queue shows `re-registered` reporters and how many of their reports were dismissed.
Reports about staff are handled by an admin only.

## Tags
Users can submit unknown tags; they sit in "Pending". Staff approve/reject them or add tags directly (single or bulk). Admins merge duplicates (profiles move to the kept tag) or delete a tag everywhere. A unique index on `(category, lower(name))` prevents new case-duplicates.

## Data kept on purpose
| Data | Kept | Why |
|---|---|---|
| Reporter GitHub ID/username on reports | 180 days after closing | Abuse prevention |
| Target GitHub ID on `suspend` log entries | 365 days | Recognise repeat violations |
| Audit log (usernames, actions, notes) | Indefinitely | Accountability |

Constants: `REPORTER_IDENTITY_RETENTION_DAYS`, `LOG_GITHUB_ID_RETENTION_DAYS` in `moderation.py`. Keep the privacy page in sync.

## Runbook
- **New report:** `/mod` → Review → read the content, then suspend, or dismiss with a note.
- **Appeal:** check the history, unsuspend if fixed, and leave a note.
- **Add a moderator:** they sign in once → `/mod/team` → Grant → they set up MFA.
- **Remove one:** `/mod/team` → Remove role (also deletes their authenticator).
- **Adding a moderation action:** call `record(...)` in the same transaction; add it to `ACTIONS` and the frontend `LOG_ACTIONS`.
- **Adding a table that references `user.id`:** set an explicit `ondelete`.