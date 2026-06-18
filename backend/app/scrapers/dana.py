from datetime import datetime, timedelta
from typing import List

from app.config import settings
from app.scrapers.base import BaseScraper, should_use_mock
from app.schemas import CouponRaw


_MOCK_DATA = [
    {
        "code": "DANA50K",
        "title": "Cashback Rp 50.000 Top Up DANA",
        "description": "Min. top up Rp 200.000 via Bank BCA. Berlaku 1x per user.",
        "discount_type": "cashback",
        "discount_value": 50000,
        "min_spend": 200000,
        "category_slug": "bills",
        "expires_at": datetime.utcnow() + timedelta(days=5),
    },
    {
        "code": None,
        "title": "Bayar PLN Diskon Rp 5.000",
        "description": "Bayar tagihan PLN min. Rp 100.000 via DANA dapat diskon Rp 5.000.",
        "discount_type": "fixed",
        "discount_value": 5000,
        "min_spend": 100000,
        "category_slug": "bills",
        "expires_at": datetime.utcnow() + timedelta(days=21),
    },
]


class DanaPromoScraper(BaseScraper):
    target_id = "dana_promo_landing"
    merchant_slug = "dana"
    name = "DANA — Public Promo Landing"
    interval_minutes = 180
    tier = "public"

    async def fetch_raw(self):
        if should_use_mock(self.target_id):
            return _MOCK_DATA
        # TODO production:
        #   - GET https://www.dana.id/promo via httpx
        #   - Parse <article class="promo-card"> dengan BeautifulSoup
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
                source_url="https://www.dana.id/promo",
                source_target=self.target_id,
            )
            for row in raw
        ]
