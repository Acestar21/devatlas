#  DevCard

**The identity layer for developers.**

DevCard is a public directory and community-style identity platform that aggregates a developer's credibility across the web into a single, shareable, and browsable profile. Instead of scattering stats across GitHub READMEs, LeetCode profiles, and social links, DevCard provides a unified "Tracker.gg for programmers."

##  The Problem
Developers' professional footprints are fragmented. GitHub activity, LeetCode progress, and personal projects live in separate silos. While static widgets exist, there is no central, browsable directory where developers can discover each other based on verified technical contributions and skill sets.

##  Key Features
- **Unified Professional Profile:** A single URL that showcases your entire technical identity.
- **Live GitHub Integration:** Real-time contributions, top languages, and repository highlights fetched via the official GitHub GraphQL API.
- **LeetCode Integration:** Self-reported stats with required profile linking for community verification.
- **Expanded Identity Layers:** Beyond code, profiles support custom sections for **Games**, **Interests**, and a flexible **Content Links** system.
- **Skill Categorization:** A robust **Tagging system** allowing developers to categorize themselves (e.g., "Frontend", "Rust", "Open Source") for easier discovery.
- **Badge System:** Integrated achievements and badges to highlight specific milestones or certifications.
- **Community Discovery:** A public, searchable directory designed for browsing and networking.
- **Identity Verification:** GitHub OAuth ensures that profiles are tied to real accounts, preventing impersonation in the public directory.

##  Tech Stack
### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (High-performance Python web framework)
- **ORM/Database:** [SQLModel](https://sqlmodel.tiangolo.com/) + [PostgreSQL](https://www.postgresql.org/)
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) (Database schema versioning)
- **Authentication:** GitHub OAuth 2.0 + Fernet Encryption for token storage at rest.

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (SSR for optimal SEO and shareable link previews)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

### Infrastructure
- **Hosting:** [Render](https://render.com/) (Managed PostgreSQL and Web Services)
- **CI/CD:** Automated deployments via Render's native Git integration.

##  Architecture & Design Decisions
DevCard was built with a focus on **defensible engineering**—choosing the right tool for the job rather than chasing resume keywords.

- **Centralized Hosting vs. Templates:** A self-hosted model was rejected because discovery and browsing are core hooks. A multi-tenant web product was necessary to enable a community directory.
- **OAuth over Tokens:** To maximize security, DevCard never handles user passwords or raw API tokens from users. GitHub OAuth is used for identity verification, and tokens are encrypted at rest using Fernet.
- **Right-Sized Infrastructure:** No Redis or Kafka were added to the stack. The project's scale is matched to its infrastructure to avoid unnecessary complexity.
- **SSR for Profiles:** Next.js Server-Side Rendering was chosen to ensure that when a profile link is shared, the metadata (OpenGraph) correctly displays the developer's stats and bio.

##  Security Posture
Security was integrated from day one:
- **Zero-Password Architecture:** All authentication is delegated to GitHub OAuth.
- **Token Encryption:** Stored GitHub tokens are encrypted at rest using a server-side Fernet key.
- **Server-Side Authorization:** Strict checks ensure users can only edit their own profiles; authorization is verified on the server for every write request.
- **Rate Limiting:** Integrated `slowapi` to prevent API abuse and ensure stability.
- **Input Validation:** Strict sanitization of social links and profile inputs to prevent XSS and injection attacks.

##  Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL instance
- GitHub OAuth Application (Client ID and Secret)

### Installation

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL=postgresql://user:password@localhost/devcard
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:8000/auth/callback
SECRET_KEY=your_secret_key
FERNET_KEY=your_fernet_key
FRONTEND_URL=http://localhost:3000
INTERNAL_API_SECRET=your_internal_secret
```
Initialize the database:
```bash
alembic upgrade head
uvicorn app.main:app --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Run the development server:
```bash
npm run dev
```

## 🗺️ Roadmap & Future Work
- [ ] **Seed Content Strategy:** Implementing a coordinated launch to populate the directory.
- [ ] **LeetCode Verification:** Exploring potential ways to move beyond social verification for LeetCode stats.
- [ ] **Advanced Search:** Adding filters to the directory (e.g., search by top language or LeetCode rank).
- [ ] **Performance Caching:** Implementing a caching layer for GitHub API responses to stay well within rate limits.

---
Developed with a focus on clean architecture and real-world utility.
