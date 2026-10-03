"""moderation: roles, suspension, reports, audit log

Revision ID: e5f7a9b1c3d5
Revises: d4e6f8a0b2c3
"""
from alembic import op
import sqlalchemy as sa

revision = "e5f7a9b1c3d5"
down_revision = "d4e6f8a0b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("role", sa.String(), nullable=False, server_default="user"))
    op.add_column("user", sa.Column("suspended", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("user", sa.Column("suspended_until", sa.DateTime(), nullable=True))
    op.add_column("user", sa.Column("suspension_reason", sa.String(), nullable=True))

    op.create_table(
        "report",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reporter_user_id", sa.Integer(), nullable=True),
        sa.Column("target_user_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("details", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("handled_by_user_id", sa.Integer(), nullable=True),
        sa.Column("handled_at", sa.DateTime(), nullable=True),
        sa.Column("resolution_note", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["handled_by_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_reporter_user_id", "report", ["reporter_user_id"])
    op.create_index("ix_report_target_user_id", "report", ["target_user_id"])
    op.create_index("ix_report_status", "report", ["status"])

    op.create_table(
        "moderationlog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_username", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("target_username", sa.String(), nullable=True),
        sa.Column("report_id", sa.Integer(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_moderationlog_created_at", "moderationlog", ["created_at"])
    op.create_index("ix_moderationlog_actor_user_id", "moderationlog", ["actor_user_id"])
    op.create_index("ix_moderationlog_action", "moderationlog", ["action"])
    op.create_index("ix_moderationlog_target_user_id", "moderationlog", ["target_user_id"])


def downgrade() -> None:
    op.drop_table("moderationlog")
    op.drop_table("report")
    op.drop_column("user", "suspension_reason")
    op.drop_column("user", "suspended_until")
    op.drop_column("user", "suspended")
    op.drop_column("user", "role")