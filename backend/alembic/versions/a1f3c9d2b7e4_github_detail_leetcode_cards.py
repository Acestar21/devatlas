"""github detail, leetcode, card visibility, posts

Revision ID: a1f3c9d2b7e4
Revises: c8021c339552
"""
from alembic import op
import sqlalchemy as sa

revision = "a1f3c9d2b7e4"
down_revision = "c8021c339552"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("githubstatscache", sa.Column("calendar_json", sa.String(), nullable=False, server_default="[]"))
    op.add_column("githubstatscache", sa.Column("extra_stats_json", sa.String(), nullable=False, server_default="{}"))
    op.add_column("githubstatscache", sa.Column("activity_json", sa.String(), nullable=False, server_default="[]"))
    op.add_column("profile", sa.Column("card_visibility_json", sa.String(), nullable=False, server_default="{}"))
    op.add_column("profile", sa.Column("posts_json", sa.String(), nullable=False, server_default="[]"))
    op.create_table(
        "leetcodestats",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("easy", sa.Integer(), nullable=False),
        sa.Column("medium", sa.Integer(), nullable=False),
        sa.Column("hard", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_leetcodestats_user_id"), "leetcodestats", ["user_id"], unique=True)
    # force a re-fetch so existing cache rows get the new fields
    op.execute("UPDATE githubstatscache SET last_fetched_at = '1970-01-01'")


def downgrade() -> None:
    op.drop_index(op.f("ix_leetcodestats_user_id"), table_name="leetcodestats")
    op.drop_table("leetcodestats")
    op.drop_column("profile", "posts_json")
    op.drop_column("profile", "card_visibility_json")
    op.drop_column("githubstatscache", "activity_json")
    op.drop_column("githubstatscache", "extra_stats_json")
    op.drop_column("githubstatscache", "calendar_json")