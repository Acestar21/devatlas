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
        # Languages
        "Python",
        "JavaScript",
        "TypeScript",
        "Java",
        "C",
        "C++",
        "C#",
        "Go",
        "Rust",
        "Kotlin",
        "Swift",
        "PHP",
        "Ruby",
        "Dart",

        # Frontend
        "HTML",
        "CSS",
        "React",
        "Next.js",
        "Vue",
        "Nuxt",
        "Angular",
        "Svelte",
        "SvelteKit",
        "Tailwind CSS",

        # Backend
        "Node.js",
        "Express",
        "NestJS",
        "FastAPI",
        "Django",
        "Flask",
        "Spring Boot",
        "Laravel",
        "Ruby on Rails",
        ".NET",
        "GraphQL",
        "REST API",

        # Databases
        "PostgreSQL",
        "MySQL",
        "SQLite",
        "MongoDB",
        "Redis",
        "MariaDB",
        "Firebase",
        "Supabase",

        # Cloud / DevOps
        "AWS",
        "Google Cloud",
        "Azure",
        "Docker",
        "Kubernetes",
        "Terraform",
        "GitHub Actions",
        "CI/CD",
        "Linux",
        "Nginx",

        # AI / Data
        "Machine Learning",
        "Deep Learning",
        "Artificial Intelligence",
        "PyTorch",
        "TensorFlow",
        "scikit-learn",
        "Pandas",
        "NumPy",
        "LangChain",
        "RAG",
        "LLMs",

        # Mobile
        "React Native",
        "Flutter",
        "Android",
        "iOS",

        # Other
        "Git",
        "GitHub",
        "WebSockets",
        "WebAssembly",
        "Electron",
        "Tauri",
    ],

    "interest": [
        # Technology
        "Open source",
        "Artificial Intelligence",
        "Machine Learning",
        "Cybersecurity",
        "Cloud computing",
        "Distributed systems",
        "Systems programming",
        "Web development",
        "Mobile development",
        "Game development",
        "DevOps",
        "Data science",
        "Robotics",
        "Blockchain",
        "Embedded systems",
        "Computer graphics",
        "UI/UX",
        "Developer tools",
        "Automation",

        # Learning / professional
        "Competitive programming",
        "Open source contribution",
        "Hackathons",
        "Tech communities",
        "Entrepreneurship",
        "Startups",
        "Research",
        "Technical writing",
        "Public speaking",

        # Creative
        "Photography",
        "Music",
        "Music production",
        "Drawing",
        "Digital art",
        "Video editing",
        "3D printing",
        "3D modeling",
        "Writing",
        "Reading",

        # Hobbies
        "Chess",
        "Anime",
        "Cooking",
        "Hiking",
        "Travel",
        "Fitness",
        "Running",
        "Cycling",
        "Football",
        "Basketball",
        "Cricket",
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