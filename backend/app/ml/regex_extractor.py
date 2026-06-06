"""Regex/heuristic fallback extractor.

Cocok untuk text terstruktur (broadcast template merchant resmi) atau saat LLM
unavailable. Coverage rate ±50% kupon (vs ±90% LLM), tapi gratis & instant.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import List

from app.schemas import CouponRaw


MERCHANT_KEYWORDS = {
    "shopee": ["shopee", "shopeepay", "spaylater"],
    "tokopedia": ["tokopedia", "tokped", "toped"],
    "dana": ["dana"],
    "ovo": ["ovo"],
    "gojek": ["gojek", "gofood", "goride", "gocar", "gosend"],
    "grab": ["grab", "grabfood", "grabbike", "grabcar"],
    "tixid": ["tix.id", "tix id", "tixid"],
    "traveloka": ["traveloka"],
    "tiket": ["tiket.com", "tiket com"],
    "lazada": ["lazada"],
    "blibli": ["blibli"],
    "bukalapak": ["bukalapak"],
    "zalora": ["zalora"],
}

CATEGORY_HINTS = {
    "food": ["gofood", "grabfood", "shopeefood", "makanan", "kuliner", "restoran"],
    "transport": ["gocar", "gobike", "grabcar", "grabbike", "ojek", "transportasi"],
    "entertainment": ["tix.id", "bioskop", "tiket bioskop", "movie", "hotel", "traveloka", "klook"],
    "bills": ["pln", "pulsa", "tagihan", "topup", "top up"],
    "ecommerce": ["shopee", "tokopedia", "lazada", "blibli", "bukalapak", "zalora"],
}

CODE_PATTERN = re.compile(r"(?i:kode|code|voucher|pakai)[:\s]+([A-Z0-9]{4,16})")
PERCENT_PATTERN = re.compile(r"(?:diskon|disc)\s*(\d{1,3})\s*%", re.IGNORECASE)
RUPIAH_PATTERN = re.compile(r"rp\.?\s*([\d\.\,]+)\s*(?:rb|ribu|k)?", re.IGNORECASE)
RUPIAH_SHORT_PATTERN = re.compile(r"(\d{1,4})\s*(?:rb|ribu|k)\b", re.IGNORECASE)
MIN_SPEND_PATTERN = re.compile(r"min(?:imum)?\.?\s*(?:belanja|order|spend|trx|transaksi)?\.?\s*rp\.?\s*([\d\.\,]+)\s*(?:rb|ribu|k)?", re.IGNORECASE)
MAX_DISC_PATTERN = re.compile(r"max(?:imum)?\.?\s*(?:diskon|disc|cap|potongan)?\.?\s*rp\.?\s*([\d\.\,]+)\s*(?:rb|ribu|k)?", re.IGNORECASE)
EXPIRY_PATTERN = re.compile(
    r"(?:berlaku\s*(?:s\.?d\.?|hingga|sampai)|exp(?:ired)?(?:\s*at)?|valid\s*(?:until|s/d)|berakhir)\s*"
    r"(\d{1,2})[\s\-/]+([\w\d]+)[\s\-/]+(\d{2,4})",
    re.IGNORECASE,
)

ID_MONTHS = {
    "jan": 1, "januari": 1, "feb": 2, "februari": 2, "mar": 3, "maret": 3,
    "apr": 4, "april": 4, "mei": 5, "may": 5, "jun": 6, "juni": 6,
    "jul": 7, "juli": 7, "agu": 8, "agustus": 8, "aug": 8, "sep": 9, "september": 9,
    "okt": 10, "oktober": 10, "oct": 10, "nov": 11, "november": 11, "des": 12, "desember": 12, "dec": 12,
}


def _parse_rupiah(text: str) -> float | None:
    m = RUPIAH_PATTERN.search(text)
    if m:
        s = m.group(1).replace(".", "").replace(",", "").strip()
        if not s:
            return None
        n = int(s)
        matched = m.group(0).lower().rstrip(" .,")
        if matched.endswith(("rb", "ribu", "k")):
            n *= 1000
        return float(n)

    m = RUPIAH_SHORT_PATTERN.search(text)
    if m:
        return float(int(m.group(1)) * 1000)
    return None


def _parse_expiry(text: str) -> datetime | None:
    m = EXPIRY_PATTERN.search(text)
    if not m:
        return None
    day, month_raw, year = m.groups()
    try:
        day_i = int(day)
        year_i = int(year)
        if year_i < 100:
            year_i += 2000
        month_i = int(month_raw) if month_raw.isdigit() else ID_MONTHS.get(month_raw.lower()[:3], 0)
        if month_i == 0:
            return None
        return datetime(year_i, month_i, day_i)
    except (ValueError, KeyError):
        return None


def _detect_merchant(text: str) -> str:
    low = text.lower()
    for slug, keywords in MERCHANT_KEYWORDS.items():
        if any(k in low for k in keywords):
            return slug
    return "multi"


def _detect_category(text: str) -> str | None:
    low = text.lower()
    for cat, hints in CATEGORY_HINTS.items():
        if any(h in low for h in hints):
            return cat
    return None


def _detect_discount(text: str) -> tuple[str, float, float | None]:
    low = text.lower()

    if any(k in low for k in ["gratis ongkir", "free ongkir", "free shipping"]):
        return "free_shipping", 0, None

    if any(k in low for k in ["buy 1 get 1", "bogo", "b1g1"]):
        return "bogo", 0, None

    is_cashback = "cashback" in low or "cb " in low

    pct = PERCENT_PATTERN.search(text)
    if pct:
        return ("cashback" if is_cashback else "percent"), float(pct.group(1)), None

    amt = _parse_rupiah(text)
    if amt:
        return ("cashback" if is_cashback else "fixed"), amt, None

    return "fixed", 0, None


def _split_blocks(text: str) -> List[str]:
    """Heuristik: pisah multi-promo per block (separator: lines kosong, bullet, emoji separator)."""
    parts = re.split(r"\n\s*\n|\n[-•▪️◆🔸✨]", text)
    return [p.strip() for p in parts if p.strip() and len(p.strip()) > 20]


def extract_regex(text: str, source_target: str = "regex") -> List[CouponRaw]:
    if not text:
        return []

    blocks = _split_blocks(text) or [text]
    out: List[CouponRaw] = []

    for block in blocks:
        code_m = CODE_PATTERN.search(block)
        code = code_m.group(1).upper() if code_m else None

        disc_type, disc_value, _ = _detect_discount(block)

        if disc_type == "fixed" and disc_value == 0 and not code:
            continue

        min_spend_m = MIN_SPEND_PATTERN.search(block)
        min_spend = None
        if min_spend_m:
            s = min_spend_m.group(1).replace(".", "").replace(",", "")
            if s.isdigit():
                min_spend = float(int(s) * (1000 if "rb" in min_spend_m.group(0).lower() else 1))

        max_disc_m = MAX_DISC_PATTERN.search(block)
        max_disc = None
        if max_disc_m:
            s = max_disc_m.group(1).replace(".", "").replace(",", "")
            if s.isdigit():
                max_disc = float(int(s) * (1000 if "rb" in max_disc_m.group(0).lower() else 1))

        merchant = _detect_merchant(block)
        category = _detect_category(block)
        expires = _parse_expiry(block)

        first_line = block.split("\n")[0].strip()
        title = first_line[:128] if first_line else f"{merchant.title()} Promo"

        out.append(
            CouponRaw(
                code=code,
                title=title,
                description=block[:280].strip(),
                discount_type=disc_type,
                discount_value=disc_value,
                min_spend=min_spend,
                max_discount=max_disc,
                merchant_slug=merchant,
                category_slug=category,
                expires_at=expires,
                source_target=source_target,
            )
        )

    return out
