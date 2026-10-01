"""games and gaming handles as JSON on profile

Revision ID: c3d5e7f9a1b2
Revises: a1f3c9d2b7e4
"""
import json
from alembic import op
import sqlalchemy as sa

revision = "c3d5e7f9a1b2"
down_revision = "a1f3c9d2b7e4"
branch_labels = None
depends_on = None

DEFAULT_VISIBILITY = json.dumps({"github": True, "leetcode": True, "games": True, "interests": True})


def upgrade() -> None:
    op.add_column("profile", sa.Column("games_json", sa.String(), nullable=False, server_default="[]"))
    op.add_column("profile", sa.Column("gaming_handles_json", sa.String(), nullable=False, server_default="[]"))

    # carry existing games over from the old table
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT ug.user_id, t.name, ug.rank_or_hours, ug.profile_url "
        "FROM usergame ug JOIN tag t ON t.id = ug.tag_id ORDER BY ug.id"
    )).fetchall()
    by_user: dict[int, list[dict]] = {}
    for user_id, name, detail, url in rows:
        by_user.setdefault(user_id, []).append(
            {"name": name[:60], "detail": (detail or "")[:40] or None, "url": url}
        )
    for user_id, games in by_user.items():
        payload = json.dumps(games[:12])
        has_profile = conn.execute(sa.text("SELECT 1 FROM profile WHERE user_id = :u"), {"u": user_id}).first()
        if has_profile:
            conn.execute(sa.text("UPDATE profile SET games_json = :g WHERE user_id = :u"), {"g": payload, "u": user_id})
        else:
            conn.execute(
                sa.text(
                    "INSERT INTO profile (user_id, theme, content_links_json, section_visibility_json, games_json) "
                    "VALUES (:u, 'default', '[]', :v, :g)"
                ),
                {"u": user_id, "v": DEFAULT_VISIBILITY, "g": payload},
            )


def downgrade() -> None:
    op.drop_column("profile", "gaming_handles_json")
    op.drop_column("profile", "games_json")