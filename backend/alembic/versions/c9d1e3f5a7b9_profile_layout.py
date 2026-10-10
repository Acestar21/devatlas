"""owner-chosen card order on the profile

Revision ID: c9d1e3f5a7b9
Revises: b8c0d2e4f6a8
"""
from alembic import op
import sqlalchemy as sa

revision = "c9d1e3f5a7b9"
down_revision = "b8c0d2e4f6a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profile", sa.Column("layout_json", sa.String(), nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("profile", "layout_json")
