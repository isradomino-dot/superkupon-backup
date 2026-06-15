"""Shopee Affiliate Open API — GraphQL Scraper (LEGAL PATH).

Resmi dari Shopee, GraphQL endpoint:
  https://open-api.affiliate.shopee.co.id/graphql

Setup:
  1. Daftar di https://affiliate.shopee.co.id/open_api
  2. Dapat APP_ID + SECRET di dashboard
  3. Auth via signature header: HMAC-SHA256(secret, appId+timestamp+payload)
  4. Query GraphQL: productOfferV2, shopOfferV2, dll.

Reference: https://open-api.affiliate.shopee.co.id/doc

⚠️  Tier: semi-public — LEGAL via partner program. Tidak melanggar ToS.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, List

import httpx

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)


_MOCK_DATA = {
    "data": {
        "shopOfferV2": {
            "nodes": [
                {
                    "shopId": 12345,
                    "shopName": "Official Store A",
                    "voucherCode": "AFFSHOP15",
                    "voucherTitle": "Diskon 15% Official Store",
                    "voucherDescription": "Min. belanja Rp 150.000.",
                    "discountPercentage": 15,
                    "discountCap": 30000,
                    "minSpend": 150000,
                    "validPeriodEnd": int((datetime.utcnow() + timedelta(days=10)).timestamp()),
                    "offerLink": "https://shope.ee/aff/12345abc",
                    "imageUrl": "/logos/shopee.png",
                },
                {
                    "shopId": 67890,
                    "shopName": "Fashion Hub",
                    "voucherCode": "FASHIONCB20",
                    "voucherTitle": "Cashback 20% Fashion",
                    "voucherDescription": "Cashback ShopeePay. Max Rp 50.000.",
                    "discountPercentage": 20,
                    "discountCap": 50000,
                    "minSpend": 100000,
                    "validPeriodEnd": int((datetime.utcnow() + timedelta(days=7)).timestamp()),
                    "offerLink": "https://shope.ee/aff/67890def",
                    "imageUrl": "/logos/shopee.png",
                },
            ]
        }
    }
}


SHOP_OFFER_QUERY = """
query {
  shopOfferV2(limit: 50, sortType: 1) {
    nodes {
      shopId
      shopName
      voucherCode
      voucherTitle
      voucherDescription
      discountPercentage
      discountCap
      minSpend
      validPeriodEnd
      offerLink
      imageUrl
    }
  }
}
""".strip()


class ShopeeAffiliateScraper(BaseScraper):
    target_id = "shopee_affiliate_api"
    merchant_slug = "shopee"
    name = "Shopee Affiliate Open API"
    interval_minutes = 240
    tier = "semi-public"

    ENDPOINT = "https://open-api.affiliate.shopee.co.id/graphql"

    def _sign(self, payload: str, ts: int) -> str:
        app_id = getattr(settings, "SHOPEE_AFFILIATE_APP_ID", "") or ""
        secret = getattr(settings, "SHOPEE_AFFILIATE_SECRET", "") or ""
        if not app_id or not secret:
            raise RuntimeError(
                "SHOPEE_AFFILIATE_APP_ID / SHOPEE_AFFILIATE_SECRET belum di-set di .env. "
                "Register di https://affiliate.shopee.co.id/open_api"
            )
        base = f"{app_id}{ts}{payload}{secret}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    async def fetch_raw(self) -> dict:
        if settings.SCRAPER_USE_MOCK:
            return _MOCK_DATA

        ts = int(time.time())
        payload = json.dumps({"query": SHOP_OFFER_QUERY}, separators=(",", ":"))
        signature = self._sign(payload, ts)
        app_id = settings.SHOPEE_AFFILIATE_APP_ID

        async with httpx.AsyncClient(timeout=settings.SCRAPER_TIMEOUT_SECONDS) as client:
            r = await client.post(
                self.ENDPOINT,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"SHA256 Credential={app_id}, Timestamp={ts}, Signature={signature}",
                },
                content=payload,
            )
            r.raise_for_status()
            return r.json()

    def parse(self, raw: dict) -> List[CouponRaw]:
        items: List[CouponRaw] = []
        nodes = (((raw.get("data") or {}).get("shopOfferV2") or {}).get("nodes")) or []

        for node in nodes:
            shop_name = node.get("shopName", "")
            valid_ts = node.get("validPeriodEnd")
            expires_at = None
            if valid_ts:
                try:
                    expires_at = datetime.fromtimestamp(int(valid_ts))
                except (ValueError, OSError):
                    pass

            disc_pct = node.get("discountPercentage")
            disc_cap = node.get("discountCap")
            min_spend = node.get("minSpend")

            discount_type = "percent" if disc_pct else "fixed"
            discount_value = float(disc_pct or disc_cap or 0)

            items.append(
                CouponRaw(
                    code=node.get("voucherCode"),
                    title=f"{shop_name}: {node.get('voucherTitle', '')}".strip(": "),
                    description=node.get("voucherDescription"),
                    discount_type=discount_type,
                    discount_value=discount_value,
                    min_spend=float(min_spend) if min_spend else None,
                    max_discount=float(disc_cap) if disc_cap else None,
                    merchant_slug=self.merchant_slug,
                    category_slug="ecommerce",
                    expires_at=expires_at,
                    source_url=node.get("offerLink"),
                    source_target=self.target_id,
                )
            )

        logger.info(f"Shopee Affiliate parsed {len(items)} vouchers")
        return items
