from datetime import datetime, timedelta
from typing import List

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw


# Mock fixture — meniru struktur respons Shopee promo landing.
# Untuk production, ganti _MOCK_DATA dengan fetch_raw() via Playwright
# atau (lebih baik) call Shopee Affiliate Open API (lihat docs/COMPLIANCE.md).
_MOCK_DATA = [
    {
        "code": "SHOPEEAAA10",
        "title": "Diskon 10% s/d Rp 25.000 untuk Semua Produk",
        "description": "Min. belanja Rp 50.000. Berlaku untuk pengguna baru ShopeePay.",
        "discount_type": "percent",
        "discount_value": 10,
        "min_spend": 50000,
        "max_discount": 25000,
        "category_slug": "ecommerce",
        "expires_at": datetime.utcnow() + timedelta(days=7),
    },
    {
        "code": "FREEONGKIR50",
        "title": "Gratis Ongkir s/d Rp 30.000",
        "description": "Min. belanja Rp 50.000. Berlaku untuk seluruh wilayah Indonesia.",
        "discount_type": "free_shipping",
        "discount_value": 0,
        "min_spend": 50000,
        "max_discount": 30000,
        "category_slug": "ecommerce",
        "expires_at": datetime.utcnow() + timedelta(days=14),
    },
    {
        "code": "FLASHSALE25",
        "title": "Cashback 25% Flash Sale 12.12",
        "description": "Khusus pengguna ShopeePay. Berlaku 12 Desember.",
        "discount_type": "cashback",
        "discount_value": 25,
        "min_spend": 100000,
        "max_discount": 50000,
        "category_slug": "ecommerce",
        "expires_at": datetime.utcnow() + timedelta(days=3),
    },
]


class ShopeePromoScraper(BaseScraper):
    target_id = "shopee_promo_landing"
    merchant_slug = "shopee"
    name = "Shopee — Public Promo Landing"
    interval_minutes = 120
    tier = "public"

    async def fetch_raw(self):
        if settings.SCRAPER_USE_MOCK:
            return _MOCK_DATA
        # TODO production:
        #   1) Playwright headless dengan stealth plugin
        #   2) ATAU pakai Shopee Affiliate API (path resmi)
        raise NotImplementedError(
            "Real Shopee scrape butuh Playwright + residential proxy. "
            "Set SCRAPER_USE_MOCK=true atau pindah ke Shopee Affiliate API."
        )

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
                source_url="https://shopee.co.id/m/promo",
                source_target=self.target_id,
            )
            for row in raw
        ]
