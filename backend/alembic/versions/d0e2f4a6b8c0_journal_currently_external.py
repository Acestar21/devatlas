"""temporary journal, 'currently into', external GitHub contributions

Revision ID: d0e2f4a6b8c0
Revises: c9d1e3f5a7b9
"""
from alembic import op
import sqlalchemy as sa

revision = "d0e2f4a6b8c0"
down_revision = "c9d1e3f5a7b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profile", sa.Column("currently_json", sa.String(), nullable=False, server_default="[]"))
    op.add_column("githubstatscache", sa.Column("external_json", sa.String(), nullable=False, server_default="[]"))
    op.create_table(
        "journalentry",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("genre", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_journalentry_user_id", "journalentry", ["user_id"])
    op.create_index("ix_journalentry_created_at", "journalentry", ["created_at"])
    op.create_index("ix_journalentry_expires_at", "journalentry", ["expires_at"])


def downgrade() -> None:
    op.drop_table("journalentry")
    op.drop_column("githubstatscache", "external_json")
    op.drop_column("profile", "currently_json")
