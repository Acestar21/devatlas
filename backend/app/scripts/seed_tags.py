"""
One-off script to seed a starter list of approved tags.
Run manually with: python -m app.scripts.seed_tags
Safe to re-run — skips any tag that already exists by (name, category).
"""
from sqlmodel import Session, select
from app.database import engine
from app.config import settings
from app.models.user import User
from app.models.tag import Tag

STARTER_TAGS = {
    "stack": [
        "Python", "JavaScript", "TypeScript", "Go", "Rust", "Java", "C++", "C#",
        "React", "Next.js", "Vue", "FastAPI", "Django", "Node.js", "PostgreSQL",
        "MongoDB", "Docker", "AWS", "Tailwind", "GraphQL",  "Frontend"
    ],
    "game": [
        "Valorant", "League of Legends", "Counter-Strike 2", "Overwatch 2",
        "Minecraft", "Apex Legends", "Genshin Impact", "Elden Ring",
        "Rocket League", "Fortnite",
    ],
    "interest": [
        "Photography", "Music production", "Reading", "Hiking", "Chess",
        "Anime", "Cooking", "3D printing", "Drawing", "Open source",
    ],
}

def seed():
    if settings.seed_system_user_id is None:
        raise RuntimeError("SEED_SYSTEM_USER_ID must be set explicitly before seeding tags.")

    with Session(engine) as session:
        if session.get(User, settings.seed_system_user_id) is None:
            raise RuntimeError(f"No user exists for SEED_SYSTEM_USER_ID={settings.seed_system_user_id}.")

        for category, names in STARTER_TAGS.items():
            for name in names:
                existing = session.exec(
                    select(Tag).where(Tag.name == name, Tag.category == category)
                ).first()
                if existing:
                    continue
                tag = Tag(
                    name=name,
                    category=category,
                    status="approved",
                    submitted_by_user_id=settings.seed_system_user_id,
                )
                session.add(tag)
        session.commit()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()