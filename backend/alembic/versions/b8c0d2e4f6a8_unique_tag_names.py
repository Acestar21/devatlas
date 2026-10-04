"""case-insensitive unique tag names per category

Revision ID: b8c0d2e4f6a8
Revises: a7b9c1d3e5f7
"""
from alembic import op
import sqlalchemy as sa

revision = "b8c0d2e4f6a8"
down_revision = "a7b9c1d3e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    duplicates = op.get_bind().execute(
        sa.text("SELECT category, lower(name) FROM tag GROUP BY 1, 2 HAVING count(*) > 1")
    ).fetchall()
    if duplicates:
        raise RuntimeError(f"Merge duplicate tags in /mod/tags first: {[tuple(d) for d in duplicates][:10]}")
    op.create_index("ix_tag_category_lower_name", "tag", ["category", sa.text("lower(name)")], unique=True)


def downgrade() -> None:
    op.drop_index("ix_tag_category_lower_name", table_name="tag")