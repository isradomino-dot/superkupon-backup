"""Helper untuk bikin scraper baru dengan boilerplate minimal.

Usage:
    SCRAPER = make_promo_scraper(
        target_id="myapp_promo",
        merchant_slug="myapp",
        name="My App Promo",
        url="https://example.com/promo",
        mock_data=[{...}, {...}],
        interval_minutes=120,
        category_default="food",
    )
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Any

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw


def make_promo_scraper(
    *,
    target_id: str,
    merchant_slug: str,
    name: str,
    url: str,
    mock_data: list[dict],
    interval_minutes: int = 120,
    tier: str = "public",
    category_default: str | None = None,
) -> type[BaseScraper]:
    """Factory: bikin scraper class dgn mock-first pattern konsisten.

    Uses type() to bundle abstract method implementations inside the class
    dict at creation time — so ABC doesn't treat the class as abstract.
    """

    async def _fetch(self) -> Any:
        if settings.SCRAPER_USE_MOCK:
            return mock_data
        raise NotImplementedError(
            f"Production scrape for {target_id} not implemented — "
            f"add real HTTP fetch (lihat docs/ADDING_NEW_SCRAPER.md)"
        )

    def _parse(self, raw: Any) -> List[CouponRaw]:
        items: List[CouponRaw] = []
        for row in raw or []:
            items.append(
                CouponRaw(
                    code=row.get("code"),
                    title=row["title"],
                    description=row.get("description"),
                    discount_type=row.get("discount_type", "fixed"),
                    discount_value=float(row.get("discount_value", 0)),
                    min_spend=row.get("min_spend"),
                    max_discount=row.get("max_discount"),
                    merchant_slug=row.get("merchant_slug", merchant_slug),
                    category_slug=row.get("category_slug", category_default),
                    expires_at=row.get("expires_at"),
                    source_url=row.get("source_url", url),
                    source_target=target_id,
                    region=row.get("region", "national"),
                )
            )
        return items

    class_name = "".join(p.title() for p in target_id.split("_")) + "Scraper"

    return type(
        class_name,
        (BaseScraper,),
        {
            "target_id": target_id,
            "merchant_slug": merchant_slug,
            "name": name,
            "interval_minutes": interval_minutes,
            "tier": tier,
            "url": url,
            "fetch_raw": _fetch,
            "parse": _parse,
        },
    )


def days_from_now(d: int) -> datetime:
    return datetime.utcnow() + timedelta(days=d)
