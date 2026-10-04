# Contributing

Thanks for helping. Bug fixes, UI polish and docs are all welcome; for larger features please open an issue first.

## Setup
See the README quick start. Run the checks before opening a PR:

```bash
cd backend && python -m unittest discover tests
cd frontend && npm run typecheck && npm run lint
```

## Guidelines
- Keep PRs small and focused: one concern each.
- **Database changes** need an Alembic migration (`alembic revision --autogenerate -m "..."`); review the generated file. Any new FK to `user.id` needs an explicit `ondelete`.
- **New public surface that shows user content?** Enforce suspension and visibility there (checklist at the top of `backend/app/moderation.py`).
- **Server-side calls to the API** go through `frontend/src/lib/backend.ts`; browser code goes through `/api/proxy`.
- **Moderation actions** must call `record(...)` for the audit log.
- Add tests for rules and permissions.
- Don't commit secrets. `.env` files are ignored.

Read docs/ARCHITECTURE.md first. Look for issues labelled `good first issue`.