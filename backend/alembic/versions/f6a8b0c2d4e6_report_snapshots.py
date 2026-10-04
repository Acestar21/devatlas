"""snapshot reporter GitHub identity on reports; GitHub id on suspension log entries

Revision ID: f6a8b0c2d4e6
Revises: e5f7a9b1c3d5
"""
from alembic import op
import sqlalchemy as sa

revision = "f6a8b0c2d4e6"
down_revision = "e5f7a9b1c3d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("report", sa.Column("reporter_github_id", sa.Integer(), nullable=True))
    op.add_column("report", sa.Column("reporter_username", sa.String(), nullable=True))
    op.add_column("moderationlog", sa.Column("target_github_id", sa.Integer(), nullable=True))
    op.create_index("ix_report_reporter_github_id", "report", ["reporter_github_id"])
    # backfill what we can from accounts that still exist
    op.execute(
        'UPDATE report SET reporter_github_id = u.github_id, reporter_username = u.github_username '
        'FROM "user" u WHERE u.id = report.reporter_user_id'
    )
    op.execute(
        'UPDATE moderationlog SET target_github_id = u.github_id '
        'FROM "user" u WHERE u.id = moderationlog.target_user_id AND moderationlog.action = \'suspend\''
    )


def downgrade() -> None:
    op.drop_index("ix_report_reporter_github_id", table_name="report")
    op.drop_column("moderationlog", "target_github_id")
    op.drop_column("report", "reporter_username")
    op.drop_column("report", "reporter_github_id")