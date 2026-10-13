"""one row per (user, tag) in stacktag / userinterest / usergame

Existing duplicates (from the old check-then-insert race) are removed first, keeping the oldest
row, so the constraint can always be added. Tag(name, category) is already unique via
ix_tag_category_lower_name.

Revision ID: e1f3a5b7c9d1
Revises: d0e2f4a6b8c0
"""
from alembic import op

revision = "e1f3a5b7c9d1"
down_revision = "d0e2f4a6b8c0"
branch_labels = None
depends_on = None

TABLES = {
    "stacktag": "uq_stacktag_user_tag",
    "userinterest": "uq_userinterest_user_tag",
    "usergame": "uq_usergame_user_tag",
}


def upgrade() -> None:
    for table, name in TABLES.items():
        op.execute(
            f"DELETE FROM {table} WHERE id NOT IN (SELECT MIN(id) FROM {table} GROUP BY user_id, tag_id)"
        )
        op.create_unique_constraint(name, table, ["user_id", "tag_id"])


def downgrade() -> None:
    for table, name in TABLES.items():
        op.drop_constraint(name, table, type_="unique")
