"""Quality scoring untuk coupon — 0..100 berdasarkan completeness + source tier.

Score breakdown:
  +30  punya code (vs no-code auto-apply)
  +20  punya expires_at (deadline jelas)
  +15  punya min_spend info
  +10  punya max_discount info
  +10  punya description non-empty
  +15  source tier bonus (semi-public=15, public=10, gray=5)

Usage:
  from app.pipelines.quality_scorer import score_coupon
  score = score_coupon(coupon_raw, source_tier="public")
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas import CouponRaw


TIER_BONUS = {
    "semi-public": 15,
    "public": 10,
    "gray": 5,
    "red": 0,
}


def score_coupon(raw: "CouponRaw", source_tier: str = "public") -> int:
    score = 0

    if raw.code:
        score += 30

    if raw.expires_at:
        score += 20

    if raw.min_spend is not None:
        score += 15

    if raw.max_discount is not None:
        score += 10

    if raw.description and len(raw.description.strip()) >= 20:
        score += 10

    score += TIER_BONUS.get(source_tier, 0)

    return min(100, max(0, score))


def quality_label(score: int) -> str:
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "poor"
