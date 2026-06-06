"""Klasifikasi endpoint berdasarkan path + isi response."""
from __future__ import annotations

import re
import yaml
from pathlib import Path
from typing import Any

from recon.analyzer.har_parser import CapturedRequest


_FILTERS_PATH = Path(__file__).resolve().parent.parent / "mitmproxy" / "filters.yaml"


def _load_filters() -> dict:
    with open(_FILTERS_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_FILTERS = _load_filters()


TIER_RULES = {
    "promo-public": {
        "path_keywords": ["/promo", "/promotion", "/banner", "/voucher", "/campaign", "/deal"],
        "body_keywords": ["voucher_code", "discount", "promo_code", "campaign_id", "banner"],
    },
    "marketing-feed": {
        "path_keywords": ["/feed", "/highlight", "/recommendation", "/discover"],
        "body_keywords": ["feed_items", "highlights", "recommendations"],
    },
    "merchant-catalog": {
        "path_keywords": ["/merchant", "/partner", "/store"],
        "body_keywords": ["merchant_list", "partners", "stores"],
    },
    "user-profile": {
        "path_keywords": ["/user", "/profile", "/me", "/balance", "/saldo"],
        "body_keywords": ["user_id", "phone", "email", "balance", "saldo"],
    },
    "transaction": {
        "path_keywords": ["/transaction", "/transfer", "/payment", "/order", "/booking"],
        "body_keywords": ["transaction_id", "trx_id", "order_id", "payment"],
    },
    "auth": {
        "path_keywords": ["/auth", "/login", "/logout", "/otp", "/token", "/pin"],
        "body_keywords": ["access_token", "refresh_token", "otp"],
    },
}

ALLOWED_TIERS = {"promo-public", "marketing-feed", "merchant-catalog"}


def _body_text(body: Any) -> str:
    if body is None:
        return ""
    if isinstance(body, str):
        return body.lower()
    import json
    try:
        return json.dumps(body, default=str).lower()
    except Exception:
        return str(body).lower()


def classify(req: CapturedRequest) -> str:
    path = req.path.lower()
    body = _body_text(req.response_body)

    for tier, rules in TIER_RULES.items():
        path_hit = any(kw in path for kw in rules["path_keywords"])
        body_hit = any(kw in body for kw in rules["body_keywords"])
        if path_hit and body_hit:
            return tier
        if path_hit:
            return tier

    return "unknown"


def detect_merchant(req: CapturedRequest) -> str | None:
    if req.merchant_hint:
        return req.merchant_hint
    for slug, cfg in _FILTERS["targets"].items():
        if any(d in req.host for d in cfg["domains"]):
            return slug
    return None


_PII_FIELDS = set(_FILTERS["pii_fields"])


def detect_auth_strategy(req: CapturedRequest) -> dict[str, Any]:
    """Inspeksi headers untuk identifikasi strategi auth."""
    h = {k.lower(): v for k, v in req.request_headers.items()}

    strategy: dict[str, Any] = {
        "bearer_token": False,
        "api_key": False,
        "hmac_signature": False,
        "device_id_required": False,
        "custom_headers": [],
    }

    if "authorization" in h:
        v = h["authorization"].lower()
        if v.startswith("bearer "):
            strategy["bearer_token"] = True
        else:
            strategy["custom_headers"].append("authorization")

    for k in h:
        if re.search(r"x[-_]?sign|signature|hmac", k):
            strategy["hmac_signature"] = True
        if re.search(r"api[-_]?key|app[-_]?key", k):
            strategy["api_key"] = True
        if re.search(r"device[-_]?id|fingerprint|udid", k):
            strategy["device_id_required"] = True
        if k.startswith("x-") and k not in {"x-requested-with"}:
            strategy["custom_headers"].append(k)

    strategy["custom_headers"] = sorted(set(strategy["custom_headers"]))
    return strategy


def extract_field_mapping(req: CapturedRequest, tier: str) -> dict[str, str]:
    """Heuristik: dari sample response, suggest JSONPath untuk field standard."""
    if tier not in ALLOWED_TIERS:
        return {}

    body = req.response_body
    if not isinstance(body, (dict, list)):
        return {}

    candidates: dict[str, list[str]] = {
        "code": [
            "voucher_code", "promo_code", "code", "couponCode", "voucherCode",
            "promotionCode", "kode",
        ],
        "title": ["title", "name", "promo_name", "campaign_name", "headline"],
        "description": ["description", "desc", "terms", "termsAndConditions", "tnc"],
        "discount_value": ["discount", "discount_value", "discountAmount", "value", "amount"],
        "discount_type": ["discount_type", "discountType", "unit", "type"],
        "expires_at": ["expires_at", "valid_until", "validUntil", "endDate", "expiry"],
        "min_spend": ["min_spend", "minimumSpend", "min_purchase", "minPurchase"],
        "max_discount": ["max_discount", "maxDiscount", "discount_cap", "cap"],
    }

    def walk(obj: Any, path: str = "$") -> dict[str, str]:
        found: dict[str, str] = {}
        if isinstance(obj, dict):
            for k, v in obj.items():
                lk = k.lower()
                for field_std, syns in candidates.items():
                    if field_std in found:
                        continue
                    if any(syn.lower() == lk or syn.lower() in lk for syn in syns):
                        found[field_std] = f"{path}.{k}"
                child = walk(v, f"{path}.{k}")
                for f_std, fp in child.items():
                    found.setdefault(f_std, fp)
        elif isinstance(obj, list) and obj:
            child = walk(obj[0], f"{path}[*]")
            for f_std, fp in child.items():
                found.setdefault(f_std, fp)
        return found

    return walk(body)
