"""LLM-based coupon extractor — Claude API dengan prompt caching.

Use case:
  Input  = teks unstructured (Telegram post, IG caption, tweet, forwarded message)
  Output = list of CouponRaw

Prompt caching strategi:
  - System prompt + few-shot examples = static → cached (5min TTL)
  - User content = dynamic (post text) — tidak di-cache

Expected hit rate: ~90% setelah beberapa request pertama dalam window 5 menit.
Cost reduction: ~75% read cost untuk system+examples block.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import List

from app.config import settings
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a precise extractor for Indonesian digital coupons / promos.

Given Indonesian-language social media or chat content (Telegram channel post, Instagram caption, Twitter post, forwarded WhatsApp message), extract ALL coupon/promo information into structured JSON.

Output format (strict JSON array, no markdown fences):
[
  {
    "code": "VOUCHERCODE or null if not provided",
    "title": "concise headline (max 120 chars)",
    "description": "detail + terms (max 280 chars)",
    "discount_type": "percent | fixed | cashback | bogo | free_shipping",
    "discount_value": number_or_0,
    "min_spend": number_or_null,
    "max_discount": number_or_null,
    "merchant_slug": "shopee|tokopedia|dana|ovo|gojek|grab|tixid|traveloka|tiket|lazada|blibli|bukalapak|zalora|klook|other",
    "category_slug": "ecommerce|food|transport|entertainment|bills",
    "expires_at_iso": "YYYY-MM-DD or null"
  }
]

Rules:
- Return ONLY the JSON array. No prose, no markdown.
- If no coupons found, return [].
- Indonesian Rupiah: parse "Rp 50.000" or "50rb" or "50K" as 50000.
- "Diskon 20%" → discount_type=percent, discount_value=20.
- "Gratis Ongkir" → discount_type=free_shipping, discount_value=0.
- "Cashback 15%" → discount_type=cashback, discount_value=15.
- "min. belanja Rp X" → min_spend=X.
- "max. diskon Rp X" → max_discount=X.
- "berlaku s/d 30 Juni 2026" → expires_at_iso="2026-06-30".
- One post may contain multiple coupons — emit one object per coupon."""


FEW_SHOT_EXAMPLES = """Example 1:
INPUT: "🔥 PROMO SHOPEE 11.11 🔥 Pakai kode SUPER11 dapat diskon 20% s/d Rp 50.000. Min belanja Rp 100rb. Berlaku 11 Nov 2026."
OUTPUT: [{"code":"SUPER11","title":"Shopee 11.11 — Diskon 20%","description":"Diskon 20% s/d Rp 50.000. Min belanja Rp 100rb.","discount_type":"percent","discount_value":20,"min_spend":100000,"max_discount":50000,"merchant_slug":"shopee","category_slug":"ecommerce","expires_at_iso":"2026-11-11"}]

Example 2:
INPUT: "Gofood diskon 30rb pakai GOMURAH30, min order 50rb. Cashback OVO 15% untuk transport, max 20rb."
OUTPUT: [{"code":"GOMURAH30","title":"GoFood Diskon Rp 30.000","description":"Min order Rp 50.000.","discount_type":"fixed","discount_value":30000,"min_spend":50000,"max_discount":null,"merchant_slug":"gojek","category_slug":"food","expires_at_iso":null},{"code":null,"title":"OVO Cashback 15% Transport","description":"Max cashback Rp 20.000.","discount_type":"cashback","discount_value":15,"min_spend":null,"max_discount":20000,"merchant_slug":"ovo","category_slug":"transport","expires_at_iso":null}]

Example 3:
INPUT: "Hai semua, selamat pagi! Hari ini cerah ya"
OUTPUT: []"""


class LLMExtractor:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import anthropic
            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(settings.ANTHROPIC_API_KEY)

    def extract(self, text: str, source_target: str = "llm") -> List[CouponRaw]:
        if not self.is_configured:
            logger.debug("ANTHROPIC_API_KEY not set, LLM extraction disabled")
            return []
        if not text or len(text.strip()) < 10:
            return []

        try:
            system_blocks = [
                {"type": "text", "text": SYSTEM_PROMPT},
                {
                    "type": "text",
                    "text": FEW_SHOT_EXAMPLES,
                    "cache_control": {"type": "ephemeral"} if settings.LLM_USE_CACHING else None,
                },
            ]
            system_blocks = [
                {k: v for k, v in b.items() if v is not None} for b in system_blocks
            ]

            response = self.client.messages.create(
                model=settings.LLM_MODEL,
                max_tokens=settings.LLM_MAX_TOKENS,
                system=system_blocks,
                messages=[{"role": "user", "content": f"INPUT: {text}\nOUTPUT:"}],
            )

            usage = getattr(response, "usage", None)
            if usage:
                logger.info(
                    f"LLM extract — in={usage.input_tokens} out={usage.output_tokens} "
                    f"cache_create={getattr(usage, 'cache_creation_input_tokens', 0)} "
                    f"cache_read={getattr(usage, 'cache_read_input_tokens', 0)}"
                )

            raw_text = response.content[0].text.strip()
            return self._parse_response(raw_text, source_target)

        except Exception as e:
            logger.warning(f"LLM extract failed: {e}")
            return []

    def _parse_response(self, raw: str, source_target: str) -> List[CouponRaw]:
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        try:
            arr = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.warning(f"LLM returned non-JSON: {raw[:200]}... err={e}")
            return []

        if not isinstance(arr, list):
            return []

        out: List[CouponRaw] = []
        for item in arr:
            try:
                expires_at = None
                if item.get("expires_at_iso"):
                    try:
                        expires_at = datetime.fromisoformat(item["expires_at_iso"])
                    except ValueError:
                        pass

                out.append(
                    CouponRaw(
                        code=item.get("code"),
                        title=item.get("title", "Untitled Promo")[:256],
                        description=(item.get("description") or "")[:1024] or None,
                        discount_type=item.get("discount_type", "fixed"),
                        discount_value=float(item.get("discount_value") or 0),
                        min_spend=float(item["min_spend"]) if item.get("min_spend") else None,
                        max_discount=float(item["max_discount"]) if item.get("max_discount") else None,
                        merchant_slug=item.get("merchant_slug") or "multi",
                        category_slug=item.get("category_slug"),
                        expires_at=expires_at,
                        source_target=source_target,
                    )
                )
            except (TypeError, ValueError) as e:
                logger.debug(f"Skip malformed LLM item: {e}")
                continue
        return out
