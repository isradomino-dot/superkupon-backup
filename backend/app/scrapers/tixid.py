from datetime import datetime, timedelta
from typing import List

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw


_MOCK_DATA = [
    {
        "code": "TIXNONTON",
        "title": "Beli 2 Tiket Diskon Rp 30.000",
        "description": "Berlaku untuk semua studio reguler. Min. 2 tiket dalam satu transaksi.",
        "discount_type": "fixed",
        "discount_value": 30000,
        "min_spend": 0,
        "category_slug": "entertainment",
        "expires_at": datetime.utcnow() + timedelta(days=14),
    },
    {
        "code": "TIXBCA15",
        "title": "Diskon 15% Bayar Kartu BCA",
        "description": "Diskon 15% untuk pembayaran kartu kredit/debit BCA.",
        "discount_type": "percent",
        "discount_value": 15,
        "max_discount": 25000,
        "category_slug": "entertainment",
        "expires_at": datetime.utcnow() + timedelta(days=30),
    },
]


class TixidPromoScraper(BaseScraper):
    target_id = "tixid_promo_landing"
    merchant_slug = "tixid"
    name = "Tix ID — Public Promo Landing"
    interval_minutes = 360
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
                source_url="https://www.tix.id/promo",
                source_target=self.target_id,
            )
            for row in raw
        ]
