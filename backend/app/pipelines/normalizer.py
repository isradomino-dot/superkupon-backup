import hashlib
import re
from datetime import datetime
from typing import Optional

from app.schemas import CouponRaw


def normalize_discount(text: str) -> tuple[str, float]:
    """Parse string diskon → (type, value).
    Contoh:
      '20%'        → ('percent', 20)
      'Rp 50.000'  → ('fixed', 50000)
      'Cashback 10%' → ('cashback', 10)
      'Gratis Ongkir' → ('free_shipping', 0)
    """
    t = text.lower().strip()

    if "gratis ongkir" in t or "free shipping" in t or "free ongkir" in t:
        return "free_shipping", 0

    if "cashback" in t:
        m = re.search(r"(\d+(?:[\.,]\d+)?)\s*%", t)
        if m:
            return "cashback", float(m.group(1).replace(",", "."))
        m = re.search(r"rp\s*([\d\.,]+)", t)
        if m:
            return "cashback", float(m.group(1).replace(".", "").replace(",", "."))

    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*%", t)
    if m:
        return "percent", float(m.group(1).replace(",", "."))

    m = re.search(r"rp\s*([\d\.,]+)", t)
    if m:
        return "fixed", float(m.group(1).replace(".", "").replace(",", "."))

    return "fixed", 0


def compute_content_hash(coupon: CouponRaw) -> str:
    """Hash deterministik untuk dedup."""
    parts = [
        (coupon.code or "").strip().upper(),
        coupon.merchant_slug.strip().lower(),
        coupon.title.strip().lower()[:128],
        f"{coupon.discount_type}:{coupon.discount_value}",
    ]
    payload = "|".join(parts).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:32]


def coerce_expires_at(value: str | datetime | None) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d %B %Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None
