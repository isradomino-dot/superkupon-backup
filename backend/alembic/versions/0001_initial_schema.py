"""initial schema — merchants, categories, coupons, scrape_logs

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-27 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "merchants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("logo_url", sa.String(512), nullable=True),
        sa.Column("website", sa.String(512), nullable=True),
    )
    op.create_index("ix_merchants_slug", "merchants", ["slug"], unique=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("icon", sa.String(64), nullable=True),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(64), nullable=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discount_type", sa.String(32), nullable=False),
        sa.Column("discount_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("min_spend", sa.Float(), nullable=True),
        sa.Column("max_discount", sa.Float(), nullable=True),
        sa.Column("merchant_id", sa.Integer(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("source_url", sa.String(1024), nullable=True),
        sa.Column("source_target", sa.String(64), nullable=False),
        sa.Column("scraped_at", sa.DateTime(), nullable=False),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("content_hash", sa.String(64), nullable=False),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"])
    op.create_index("ix_coupons_merchant_id", "coupons", ["merchant_id"])
    op.create_index("ix_coupons_category_id", "coupons", ["category_id"])
    op.create_index("ix_coupons_source_target", "coupons", ["source_target"])
    op.create_index("ix_coupons_status", "coupons", ["status"])
    op.create_index("ix_coupons_content_hash", "coupons", ["content_hash"])
    op.create_index("idx_merchant_status", "coupons", ["merchant_id", "status"])
    op.create_index("idx_status_expires", "coupons", ["status", "expires_at"])

    op.create_table(
        "scrape_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("target_id", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("items_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_new", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_scrape_logs_target_id", "scrape_logs", ["target_id"])


def downgrade() -> None:
    op.drop_table("scrape_logs")
    op.drop_table("coupons")
    op.drop_table("categories")
    op.drop_table("merchants")
