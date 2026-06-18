"""Involve Asia — Affiliate Network Scraper (LEGAL PATH).

Involve Asia adalah affiliate network resmi yang cover:
  - Shopee, Tokopedia, Lazada, Zalora, Klook, Traveloka, Tiket.com, dll.
  - Indonesia, Malaysia, Singapore, Philippines, Thailand, Vietnam.

Setup:
  1. Register publisher: https://www.involve.asia/
  2. Approved → dapat API_KEY + API_SECRET di dashboard
  3. Get token via POST /authenticate (returns Bearer JWT, valid 24 jam)
  4. Call /api/coupons untuk list voucher per offer/merchant

⚠️  Production scraper ini PRODUCTION-LEGAL. Tidak ada ToS violation.
    Compensation: revenue share dari user click yang convert.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, List

import httpx

from app.config import settings
from app.scrapers.base import BaseScraper, should_use_mock
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)


_MOCK_DATA = {
    "data": {
        "data": [
            {
                "offer_id": 1001,
                "offer_name": "Shopee Indonesia",
                "merchant_logo": "/logos/shopee.png",
                "coupons": [
                    {
                        "coupon_code": "AFFIL10",
                        "title": "Affiliate Exclusive Diskon 10%",
                        "description": "Min. belanja Rp 100.000 untuk pengguna baru.",
                        "discount_value": 10,
                        "discount_unit": "percent",
                        "valid_until": (datetime.utcnow() + timedelta(days=20)).strftime("%Y-%m-%d %H:%M:%S"),
                        "tracking_link": "https://involve.asia/aff_c?...",
                    },
                    {
                        "coupon_code": "FREESHIP25K",
                        "title": "Gratis Ongkir s/d Rp 25.000",
                        "description": "Min. belanja Rp 75.000. Berlaku semua wilayah.",
                        "discount_value": 25000,
                        "discount_unit": "free_shipping",
                        "valid_until": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S"),
                        "tracking_link": "https://involve.asia/aff_c?...",
                    },
                ],
            },
            {
                "offer_id": 1002,
                "offer_name": "Tokopedia",
                "merchant_logo": "/logos/tokopedia.png",
                "coupons": [
                    {
                        "coupon_code": "TOKAFFNEW",
                        "title": "Diskon Rp 50.000 Pengguna Baru",
                        "description": "Min. belanja Rp 250.000 — affiliate exclusive.",
                        "discount_value": 50000,
                        "discount_unit": "fixed",
                        "valid_until": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S"),
                        "tracking_link": "https://involve.asia/aff_c?...",
                    },
                ],
            },
        ]
    }
}


class InvolveAsiaScraper(BaseScraper):
    target_id = "involve_asia_api"
    merchant_slug = "multi"  # multi-merchant — per coupon mapped to actual merchant
    name = "Involve Asia (Affiliate API)"
    interval_minutes = 360
    tier = "semi-public"

    AUTH_URL = "https://api.involve.asia/api/authenticate"
    COUPONS_URL = "https://api.involve.asia/api/coupons"

    OFFER_TO_MERCHANT = {
        "shopee": "shopee",
        "tokopedia": "tokopedia",
        "lazada": "lazada",
        "zalora": "zalora",
        "klook": "klook",
        "traveloka": "traveloka",
        "tiket.com": "tiket",
        "tiket": "tiket",
        "blibli": "blibli",
        "bukalapak": "bukalapak",
    }

    OFFER_TO_CATEGORY = {
        "shopee": "ecommerce",
        "tokopedia": "ecommerce",
        "lazada": "ecommerce",
        "zalora": "ecommerce",
        "blibli": "ecommerce",
        "bukalapak": "ecommerce",
        "klook": "entertainment",
        "traveloka": "entertainment",
        "tiket": "entertainment",
        "tiket.com": "entertainment",
    }

    def _merchant_slug_from_offer(self, offer_name: str) -> str:
        name = (offer_name or "").lower()
        for keyword, slug in self.OFFER_TO_MERCHANT.items():
            if keyword in name:
                return slug
        return name.replace(" ", "-").replace(".", "").strip() or "multi"

    def _category_for_offer(self, offer_name: str) -> str | None:
        name = (offer_name or "").lower()
        for keyword, cat in self.OFFER_TO_CATEGORY.items():
            if keyword in name:
                return cat
        return None

    def _normalize_discount(self, unit: str, value: float) -> tuple[str, float]:
        u = (unit or "").lower()
        if u in {"percent", "percentage", "%"}:
            return "percent", float(value or 0)
        if u in {"free_shipping", "freeshipping"}:
            return "free_shipping", float(value or 0)
        if u == "cashback":
            return "cashback", float(value or 0)
        if u in {"fixed", "amount", "flat"}:
            return "fixed", float(value or 0)
        return "fixed", float(value or 0)

    async def _get_token(self) -> str:
        api_key = getattr(settings, "INVOLVE_ASIA_API_KEY", "") or ""
        api_secret = getattr(settings, "INVOLVE_ASIA_API_SECRET", "") or ""
        if not api_key or not api_secret:
            raise RuntimeError(
                "INVOLVE_ASIA_API_KEY / INVOLVE_ASIA_API_SECRET belum di-set di .env. "
                "Register di https://www.involve.asia/ untuk dapat credentials."
            )

        async with httpx.AsyncClient(timeout=settings.SCRAPER_TIMEOUT_SECONDS) as client:
            r = await client.post(
                self.AUTH_URL,
                data={"key": api_key, "secret": api_secret},
            )
            r.raise_for_status()
            return r.json()["data"]["token"]

    async def fetch_raw(self) -> dict:
        if should_use_mock(self.target_id):
            return _MOCK_DATA

        token = await self._get_token()
        async with httpx.AsyncClient(timeout=settings.SCRAPER_TIMEOUT_SECONDS) as client:
            r = await client.post(
                self.COUPONS_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                data={"page": 1, "limit": 100},
            )
            r.raise_for_status()
            return r.json()

    def parse(self, raw: dict) -> List[CouponRaw]:
        items: List[CouponRaw] = []
        offers = (raw.get("data") or {}).get("data") or []

        for offer in offers:
            merchant = self._merchant_slug_from_offer(offer.get("offer_name", ""))
            category = self._category_for_offer(offer.get("offer_name", ""))

            for c in offer.get("coupons", []) or []:
                disc_type, disc_value = self._normalize_discount(
                    c.get("discount_unit", "fixed"),
                    c.get("discount_value", 0),
                )

                expires_at = None
                if c.get("valid_until"):
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
                        try:
                            expires_at = datetime.strptime(c["valid_until"], fmt)
                            break
                        except ValueError:
                            continue

                items.append(
                    CouponRaw(
                        code=c.get("coupon_code"),
                        title=c.get("title", "Affiliate Promo"),
                        description=c.get("description"),
                        discount_type=disc_type,
                        discount_value=disc_value,
                        merchant_slug=merchant,
                        category_slug=category,
                        expires_at=expires_at,
                        source_url=c.get("tracking_link"),
                        source_target=self.target_id,
                    )
                )

        logger.info(f"InvolveAsia parsed {len(items)} coupons across {len(offers)} offers")
        return items
