"""staff MFA

Revision ID: a7b9c1d3e5f7
Revises: f6a8b0c2d4e6
"""
from alembic import op
import sqlalchemy as sa

revision = "a7b9c1d3e5f7"
down_revision = "f6a8b0c2d4e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "staffmfa",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("secret_encrypted", sa.String(), nullable=True),
        sa.Column("pending_secret_encrypted", sa.String(), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(), nullable=True),
        sa.Column("last_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        sa.Column("recovery_hashes_json", sa.String(), nullable=False, server_default="[]"),
        sa.Column("elevation_revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_staffmfa_user_id", "staffmfa", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_staffmfa_user_id", table_name="staffmfa")
    op.drop_table("staffmfa")