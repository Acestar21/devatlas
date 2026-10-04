"""Emergency MFA reset, e.g. the admin lost their phone and recovery codes.

    python -m app.scripts.reset_mfa <github_username>

Needs DATABASE_URL (run it where you can reach the database). Afterwards log in and set up MFA again.
"""
import sys

from sqlalchemy import func
from sqlmodel import Session, select

from app.database import engine
from app.models.staff_mfa import StaffMfa
from app.models.user import User


def main(username: str) -> None:
    with Session(engine) as session:
        user = session.exec(select(User).where(func.lower(User.github_username) == username.lower())).first()
        if user is None:
            raise SystemExit(f"No user named '{username}'.")
        row = session.exec(select(StaffMfa).where(StaffMfa.user_id == user.id)).first()
        if row is None:
            raise SystemExit(f"@{user.github_username} has no MFA set up.")
        session.delete(row)
        session.commit()
        print(f"MFA reset for @{user.github_username}. Log in and set it up again at /mod/mfa.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.scripts.reset_mfa <github_username>")
    main(sys.argv[1])