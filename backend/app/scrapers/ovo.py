from datetime import datetime, timedelta
from typing import List

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw


_MOCK_DATA = [
    {
        "code": "OVOFOOD20",
        "title": "Diskon 20% Makan di Restoran Partner",
        "description": "Min. transaksi Rp 75.000. Berlaku di GrabFood & restoran offline partner OVO.",
        "discount_type": "percent",
        "discount_value": 20,
        "min_spend": 75000,
        "max_discount": 25000,
        "category_slug": "food",
        "expires_at": datetime.utcnow() + timedelta(days=10),
    },
    {
        "code": "OVOCB15",
        "title": "Cashback 15% Transportasi",
        "description": "Cashback OVO Points 15% untuk perjalanan Grab.",
        "discount_type": "cashback",
        "discount_value": 15,
        "min_spend": 20000,
        "max_discount": 15000,
        "category_slug": "transport",
        "expires_at": datetime.utcnow() + timedelta(days=4),
    },
]


class OvoPromoScraper(BaseScraper):
    target_id = "ovo_promo_landing"
    merchant_slug = "ovo"
    name = "OVO — Public Promo Landing"
    interval_minutes = 240
    tier = "public"

    async def fetch_raw(self):
        if settings.SCRAPER_USE_MOCK:
            return _MOCK_DATA
        raise NotImplementedError("Set SCRAPER_USE_MOCK=true untuk PoC")

    def parse(self, raw) -> List[CouponRaw]:
        return [
            CouponRaw(
                code=row["code"],
                title=row["title"],
                description=row["description"],
                discount_type=row["discount_type"],
                discount_value=row["discount_value"],
                min_spend=row.get("min_spend"),
                max_discount=row.get("max_discount"),
                merchant_slug=self.merchant_slug,
                category_slug=row.get("category_slug"),
                expires_at=row.get("expires_at"),
                source_url="https://www.ovo.id/promo",
                source_target=self.target_id,
            )
            for row in raw
        ]
