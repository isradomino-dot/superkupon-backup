"""Weekly email digest — kirim ringkasan KPI + top kupon via Resend.com.

Pemicu:
  - Cron job di scheduler.py (Senin 08:00 WIB / 01:00 UTC)
  - Manual via POST /admin/digest/send-test

Safety gate:
  - settings.DIGEST_ENABLED harus True (default False — fail-closed)
  - settings.RESEND_API_KEY harus terisi
  - settings.DIGEST_RECIPIENTS minimal 1 email (kecuali override eksplisit)

Template:
  Inline-styled HTML (no Tailwind/MJML) — kompatibel sama Gmail/Outlook/Yahoo.
  Bahasa casual Indonesia, ringkas, scannable.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from html import escape
from typing import Any, Iterable

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import joinedload

from app.config import settings
from app.db import SessionLocal
from app.models import Coupon, Merchant

logger = logging.getLogger(__name__)


# ---------- helpers ----------------------------------------------------------

_MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def _fmt_date_id(dt: datetime) -> str:
    return f"{dt.day} {_MONTHS_ID[dt.month - 1]} {dt.year}"


def _fmt_discount(c: Coupon) -> str:
    """Render discount jadi human-readable label (e.g. '50%', 'Rp50.000', 'Cashback Rp10rb')."""
    dtype = (c.discount_type or "").lower()
    val = c.discount_value or 0
    if dtype == "percent":
        return f"Diskon {int(val)}%"
    if dtype == "fixed":
        return f"Diskon Rp{int(val):,}".replace(",", ".")
    if dtype == "cashback":
        return f"Cashback Rp{int(val):,}".replace(",", ".")
    if dtype == "free_shipping":
        return "Gratis Ongkir"
    if dtype == "bogo":
        return "Beli 1 Gratis 1"
    return "Promo Spesial"


def _coupon_url(coupon_id: int) -> str:
    base = settings.DIGEST_PUBLIC_BASE_URL.rstrip("/")
    return f"{base}/coupons/{coupon_id}"


def _all_coupons_url() -> str:
    base = settings.DIGEST_PUBLIC_BASE_URL.rstrip("/")
    return f"{base}/coupons"


# ---------- data collection --------------------------------------------------

def _collect_digest_data(db) -> dict[str, Any]:
    """Query DB sekali, return dict { stats, top_coupons, expiring } siap di-render."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    expiring_until = now + timedelta(days=3)

    active_filter = Coupon.status.in_(["active", "expiring_soon"])

    total_active = db.query(Coupon).filter(active_filter).count()
    new_7d = (
        db.query(Coupon)
        .filter(active_filter)
        .filter(Coupon.scraped_at >= week_ago)
        .count()
    )
    total_views = db.query(func.coalesce(func.sum(Coupon.view_count), 0)).scalar() or 0

    top_merchants_rows = (
        db.query(Merchant.slug, Merchant.name, func.count(Coupon.id).label("c"))
        .outerjoin(Coupon, (Coupon.merchant_id == Merchant.id) & active_filter)
        .group_by(Merchant.id)
        .order_by(func.count(Coupon.id).desc())
        .limit(5)
        .all()
    )
    top_merchants = [
        {"slug": s, "name": n, "count": int(c)}
        for s, n, c in top_merchants_rows
        if c and c > 0
    ]

    # Top 5 kupon — ranking by quality_score desc, lalu view_count desc
    top_coupons = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant))
        .filter(active_filter)
        .order_by(Coupon.quality_score.desc(), Coupon.view_count.desc())
        .limit(5)
        .all()
    )

    # Expiring soon — 3 kupon, ranking by tanggal expire paling deket
    expiring = (
        db.query(Coupon)
        .options(joinedload(Coupon.merchant))
        .filter(active_filter)
        .filter(
            and_(
                Coupon.expires_at.isnot(None),
                Coupon.expires_at >= now,
                Coupon.expires_at <= expiring_until,
            )
        )
        .order_by(Coupon.expires_at.asc())
        .limit(3)
        .all()
    )

    return {
        "stats": {
            "total_active": total_active,
            "new_7d": new_7d,
            "total_views": int(total_views),
            "top_merchants": top_merchants,
            "as_of": now,
        },
        "top_coupons": top_coupons,
        "expiring": expiring,
    }


# ---------- HTML rendering ---------------------------------------------------

def _render_coupon_card(c: Coupon, *, show_image: bool = True) -> str:
    merchant_name = c.merchant.name if c.merchant else "Merchant"
    title = escape(c.title or "Promo")
    discount = escape(_fmt_discount(c))
    href = _coupon_url(c.id)
    logo = c.merchant.logo_url if (show_image and c.merchant and c.merchant.logo_url) else ""

    # Resolve logo ke absolute URL kalau relatif (e.g. "/logos/shopee.png")
    if logo and logo.startswith("/"):
        logo = f"{settings.DIGEST_PUBLIC_BASE_URL.rstrip('/')}{logo}"

    img_block = ""
    if logo:
        img_block = (
            f'<td width="56" valign="top" style="padding-right:12px;">'
            f'<img src="{escape(logo)}" width="48" height="48" alt="{escape(merchant_name)}" '
            f'style="display:block;border-radius:8px;background:#f3f4f6;" />'
            f'</td>'
        )

    expire_line = ""
    if c.expires_at:
        expire_line = (
            f'<div style="font-size:12px;color:#6b7280;margin-top:4px;">'
            f'Berlaku sampai {escape(_fmt_date_id(c.expires_at))}'
            f'</div>'
        )

    return f"""
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            {img_block}
            <td valign="top">
              <div style="font-size:12px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">
                {escape(merchant_name)} &middot; {discount}
              </div>
              <div style="font-size:15px;color:#111827;font-weight:600;margin-top:2px;line-height:1.35;">
                <a href="{escape(href)}" style="color:#111827;text-decoration:none;">{title}</a>
              </div>
              {expire_line}
              <div style="margin-top:8px;">
                <a href="{escape(href)}"
                   style="display:inline-block;font-size:13px;color:#2563eb;text-decoration:none;font-weight:600;">
                  Lihat detail &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


def _render_top_merchants(top_merchants: list[dict]) -> str:
    if not top_merchants:
        return '<div style="font-size:13px;color:#6b7280;">Belum ada data merchant.</div>'
    items = " &middot; ".join(
        f'<span style="color:#111827;font-weight:600;">{escape(m["name"])}</span>'
        f'<span style="color:#6b7280;"> ({m["count"]})</span>'
        for m in top_merchants
    )
    return f'<div style="font-size:13px;color:#374151;line-height:1.8;">{items}</div>'


def build_weekly_digest_html(
    stats: dict[str, Any],
    top_coupons: Iterable[Coupon],
    expiring: Iterable[Coupon],
) -> str:
    """Generate full HTML email body (inline styles, responsive 600px).

    Args:
        stats: dict berisi total_active, new_7d, total_views, top_merchants, as_of
        top_coupons: iterable Coupon objects (sudah eager-loaded merchant)
        expiring: iterable Coupon objects (expiring dalam 3 hari, eager-loaded)

    Returns:
        HTML string siap dikirim via Resend (sudah include <html><body>).
    """
    as_of: datetime = stats.get("as_of") or datetime.utcnow()
    date_label = _fmt_date_id(as_of)

    total_active = stats.get("total_active", 0)
    new_7d = stats.get("new_7d", 0)
    total_views = stats.get("total_views", 0)
    top_merchants = stats.get("top_merchants") or []

    top_cards = "".join(_render_coupon_card(c) for c in top_coupons) or (
        '<tr><td style="padding:16px 0;font-size:13px;color:#6b7280;">'
        'Belum ada kupon aktif minggu ini.</td></tr>'
    )
    expiring_cards = "".join(_render_coupon_card(c) for c in expiring) or (
        '<tr><td style="padding:16px 0;font-size:13px;color:#6b7280;">'
        'Gak ada kupon yang expire 3 hari ke depan — santai dulu.</td></tr>'
    )
    merchants_block = _render_top_merchants(top_merchants)
    cta_url = _all_coupons_url()
    base_url = settings.DIGEST_PUBLIC_BASE_URL

    return f"""<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SuperKupon Weekly — {escape(date_label)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f3f4f6;">
    Ringkasan kupon minggu ini: {total_active} aktif, {new_7d} baru, top deals + yang segera expired.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444 0%,#f97316 100%);padding:24px 28px;color:#ffffff;">
              <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">
                SuperKupon Weekly
              </div>
              <div style="font-size:22px;font-weight:700;margin-top:6px;">
                Ringkasan {escape(date_label)}
              </div>
              <div style="font-size:14px;margin-top:4px;opacity:0.92;">
                Kupon paling worth-it minggu ini, langsung ke inbox kamu.
              </div>
            </td>
          </tr>

          <!-- KPI block -->
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" align="center" style="padding:12px;background:#fef2f2;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#ef4444;">{total_active}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Kupon Aktif</div>
                  </td>
                  <td width="4"></td>
                  <td width="33%" align="center" style="padding:12px;background:#ecfdf5;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#059669;">+{new_7d}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Baru 7 Hari</div>
                  </td>
                  <td width="4"></td>
                  <td width="33%" align="center" style="padding:12px;background:#eff6ff;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#2563eb;">{total_views:,}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Total Views</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top merchants -->
          <tr>
            <td style="padding:16px 28px 4px 28px;">
              <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
                Merchant Teratas
              </div>
              {merchants_block}
            </td>
          </tr>

          <!-- Top 5 kupon -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:4px;">
                Top 5 Kupon Pilihan
              </div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
                Berdasarkan quality score &amp; popularitas
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                {top_cards}
              </table>
            </td>
          </tr>

          <!-- Expiring -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:4px;">
                Buruan! Expire Dalam 3 Hari
              </div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
                Sebelum kelewat, sikat dulu yang berikut
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                {expiring_cards}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:28px;">
              <a href="{escape(cta_url)}"
                 style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;
                        font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">
                Lihat semua kupon &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 28px;border-top:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#6b7280;line-height:1.6;">
                Kamu nerima email ini karena terdaftar sebagai admin SuperKupon.<br/>
                Mau berhenti? Reply email ini dengan subject &quot;unsubscribe&quot; — manual unlist (belum ada self-service).
              </div>
              <div style="font-size:12px;color:#9ca3af;margin-top:10px;">
                <a href="{escape(base_url)}" style="color:#9ca3af;text-decoration:underline;">superkupon.vercel.app</a>
                &middot; Dikirim {escape(_fmt_date_id(as_of))}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------- send -------------------------------------------------------------

def send_weekly_digest(recipients: list[str] | None = None) -> dict[str, Any]:
    """Generate digest dan kirim via Resend.com.

    Args:
        recipients: optional override list email. Kalau None, baca dari
                    settings.DIGEST_RECIPIENTS (csv split).

    Returns:
        dict { ok: bool, sent_to: list[str], message_id?: str, error?: str, skipped_reason?: str }
    """
    # Safety gate — fail-closed
    if not settings.DIGEST_ENABLED and recipients is None:
        # Cron call (no override) — gate aktif, skip
        msg = "DIGEST_ENABLED=false; skip cron send"
        logger.info(msg)
        return {"ok": False, "sent_to": [], "skipped_reason": msg}

    # Resolve recipients
    final_recipients: list[str]
    if recipients:
        final_recipients = [r.strip() for r in recipients if r and r.strip()]
    else:
        final_recipients = [
            r.strip()
            for r in (settings.DIGEST_RECIPIENTS or "").split(",")
            if r and r.strip()
        ]

    if not final_recipients:
        msg = "Tidak ada recipient (DIGEST_RECIPIENTS kosong & no override)"
        logger.warning(msg)
        return {"ok": False, "sent_to": [], "error": msg}

    if not settings.RESEND_API_KEY:
        msg = "RESEND_API_KEY belum di-set di env"
        logger.warning(msg)
        return {"ok": False, "sent_to": [], "error": msg}

    # Build HTML
    db = SessionLocal()
    try:
        data = _collect_digest_data(db)
        html = build_weekly_digest_html(
            data["stats"], data["top_coupons"], data["expiring"]
        )
        date_label = _fmt_date_id(data["stats"]["as_of"])
    finally:
        db.close()

    subject = f"SuperKupon Weekly — {date_label}"

    # Lazy import resend supaya module tetep importable kalau dependency belum di-install
    # (e.g. di test environment yang slim).
    try:
        import resend  # type: ignore
    except ImportError as e:
        msg = f"resend package belum terinstall: {e}"
        logger.error(msg)
        return {"ok": False, "sent_to": [], "error": msg}

    resend.api_key = settings.RESEND_API_KEY
    try:
        result = resend.Emails.send({
            "from": settings.DIGEST_FROM_EMAIL,
            "to": final_recipients,
            "subject": subject,
            "html": html,
        })
        message_id = (result or {}).get("id") if isinstance(result, dict) else None
        logger.info(
            f"Digest sent OK to {len(final_recipients)} recipients (id={message_id})"
        )
        return {
            "ok": True,
            "sent_to": final_recipients,
            "message_id": message_id,
            "subject": subject,
        }
    except Exception as e:
        logger.exception(f"Resend send failed: {e}")
        return {"ok": False, "sent_to": final_recipients, "error": str(e)}
