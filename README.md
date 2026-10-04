# DevAtlas

An open-source directory of developer profiles. Sign in with GitHub, add your stack, games, interests and writing, and share one link.

**Live:** https://YOUR-SITE · **Docs:** [docs/](docs/)

<!-- Add 2-3 screenshots here: profile page, GitHub tab, directory -->

## Features

- GitHub sign-in with the read-only `read:user` scope
- Profile: bio, stack tags, links, interests, games and gaming handles, blog post cards, self-reported LeetCode stats
- GitHub stats: contribution graph, streaks, pinned repos, languages, recent public activity (cached, refreshed at most every 6 hours)
- Per-section and per-card visibility. Hidden data is never sent to other visitors.
- Searchable directory, embeddable README badge, three themes (terminal, coffee, forest)
- Self-service account deletion that also revokes the GitHub authorization
- Moderation: user reports, temporary suspensions, audit log, MFA-protected staff panel

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, CSS Modules |
| Backend | FastAPI, SQLModel, Alembic, slowapi |
| Database | PostgreSQL |
| Hosting | Vercel (frontend), Render (API), Neon (database) |

## Quick start

Requirements: Node.js 20.9+, Python 3.11+, PostgreSQL, a [GitHub OAuth App](https://github.com/settings/developers) with callback URL `http://localhost:3000/api/auth/callback`.

```bash
git clone https://github.com/Acestar21/devatlas && cd devatlas

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # fill it in; see docs/DEPLOYMENT.md
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Generate secrets:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"   # FERNET_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"                                 # SECRET_KEY, INTERNAL_API_SECRET
```

`ADMIN_GITHUB_ID` is your numeric GitHub ID; that account is always the admin.

## Tests and checks

```bash
cd backend && python -m unittest discover tests
cd frontend && npm run typecheck && npm run lint
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how requests, auth, rate limiting and visibility work
- [Deployment](docs/DEPLOYMENT.md): environment variables, migrations, going live
- [Moderation](docs/MODERATION.md): roles, MFA, suspensions, runbook
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md)

## License

GNU AGPL [LICENSE](LICENSE). (Choose a licence and add the file; without one, nobody may legally reuse the code.)