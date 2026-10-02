"""allow anonymizing tag submitter on account deletion

Revision ID: d4e6f8a0b2c3
Revises: c3d5e7f9a1b2
"""
from alembic import op
import sqlalchemy as sa

revision = "d4e6f8a0b2c3"
down_revision = "c3d5e7f9a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("tag", "submitted_by_user_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("tag", "submitted_by_user_id", existing_type=sa.Integer(), nullable=False)