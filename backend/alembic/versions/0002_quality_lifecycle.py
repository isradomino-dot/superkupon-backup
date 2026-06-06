"""add quality_score, view_count, redeem_count + expiring_soon status

Revision ID: 0002_quality_lifecycle
Revises: 0001_initial
Create Date: 2026-05-28 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_quality_lifecycle"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("coupons", sa.Column("quality_score", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("coupons", sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("coupons", sa.Column("redeem_count", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("ix_coupons_quality_score", "coupons", ["quality_score"])


def downgrade() -> None:
    op.drop_index("ix_coupons_quality_score", table_name="coupons")
    op.drop_column("coupons", "redeem_count")
    op.drop_column("coupons", "view_count")
    op.drop_column("coupons", "quality_score")
