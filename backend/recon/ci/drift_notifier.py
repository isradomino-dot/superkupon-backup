"""Endpoint drift detector + notifier.

Workflow:
  1. Compare endpoint catalog latest vs sebelumnya (per merchant)
  2. Detect: added / removed / schema-changed endpoints
  3. Optionally notify ke Telegram (kalau token di-set)
  4. Write summary ke recon/captures/drift_<ts>.json

Usage:
    python -m recon.ci.drift_notifier --merchant dana
    python -m recon.ci.drift_notifier --merchant dana --notify
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

CAPTURES = Path(__file__).resolve().parent.parent / "captures"


def _list_catalogs(merchant: str) -> list[Path]:
    pattern = f"{merchant}*.endpoints.json"
    files = sorted(CAPTURES.glob(pattern), key=lambda p: p.stat().st_mtime)
    return files


def _load(p: Path) -> dict[str, Any]:
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_drift(old: dict, new: dict) -> dict[str, Any]:
    old_by_id = {e["id"]: e for e in old.get("in_scope_endpoints", [])}
    new_by_id = {e["id"]: e for e in new.get("in_scope_endpoints", [])}

    added = sorted(set(new_by_id) - set(old_by_id))
    removed = sorted(set(old_by_id) - set(new_by_id))
    common = set(old_by_id) & set(new_by_id)

    field_changes: list[dict[str, Any]] = []
    auth_changes: list[dict[str, Any]] = []

    for eid in common:
        o, n = old_by_id[eid], new_by_id[eid]
        if o.get("field_mapping") != n.get("field_mapping"):
            removed_fields = set(o.get("field_mapping", {})) - set(n.get("field_mapping", {}))
            added_fields = set(n.get("field_mapping", {})) - set(o.get("field_mapping", {}))
            if removed_fields or added_fields:
                field_changes.append({
                    "id": eid,
                    "removed_fields": sorted(removed_fields),
                    "added_fields": sorted(added_fields),
                })
        if o.get("auth_strategy") != n.get("auth_strategy"):
            auth_changes.append({
                "id": eid,
                "old": o.get("auth_strategy"),
                "new": n.get("auth_strategy"),
            })

    return {
        "ts": datetime.utcnow().isoformat(),
        "merchant": new.get("merchant"),
        "old_source": old.get("source_capture"),
        "new_source": new.get("source_capture"),
        "added": added,
        "removed": removed,
        "field_changes": field_changes,
        "auth_changes": auth_changes,
        "total_old": len(old_by_id),
        "total_new": len(new_by_id),
        "has_drift": bool(added or removed or field_changes or auth_changes),
    }


def _format_telegram(drift: dict) -> str:
    parts = [f"🔍 <b>Endpoint Drift — {drift['merchant']}</b>"]
    parts.append(f"Catalog: {drift['total_old']} → {drift['total_new']} endpoints")

    if drift["added"]:
        parts.append(f"\n➕ <b>Added ({len(drift['added'])}):</b>")
        for i in drift["added"][:5]:
            parts.append(f"  • <code>{i}</code>")
        if len(drift["added"]) > 5:
            parts.append(f"  ... +{len(drift['added']) - 5} more")

    if drift["removed"]:
        parts.append(f"\n➖ <b>Removed ({len(drift['removed'])}):</b>")
        for i in drift["removed"][:5]:
            parts.append(f"  • <code>{i}</code>")
        if len(drift["removed"]) > 5:
            parts.append(f"  ... +{len(drift['removed']) - 5} more")

    if drift["field_changes"]:
        parts.append(f"\n🔄 <b>Schema changed ({len(drift['field_changes'])}):</b>")
        for ch in drift["field_changes"][:5]:
            line = f"  • <code>{ch['id']}</code>"
            if ch["added_fields"]:
                line += f" +{ch['added_fields']}"
            if ch["removed_fields"]:
                line += f" -{ch['removed_fields']}"
            parts.append(line)

    if drift["auth_changes"]:
        parts.append(f"\n🔐 <b>Auth changed ({len(drift['auth_changes'])}):</b>")
        for ch in drift["auth_changes"][:3]:
            parts.append(f"  • <code>{ch['id']}</code>")

    if not drift["has_drift"]:
        parts.append("\n✅ No drift — schema stable.")

    return "\n".join(parts)


async def _notify(text: str) -> bool:
    from app.config import settings
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHANNEL_ID:
        return False
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json={
            "chat_id": settings.TELEGRAM_CHANNEL_ID,
            "text": text,
            "parse_mode": "HTML",
        })
        return r.status_code == 200


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--merchant", required=True, help="Merchant slug (dana, ovo, tixid, dll)")
    parser.add_argument("--notify", action="store_true", help="Kirim ke Telegram kalau ada drift")
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout output")
    args = parser.parse_args(argv)

    catalogs = _list_catalogs(args.merchant)
    if len(catalogs) < 2:
        if not args.quiet:
            print(f"[!] Butuh minimal 2 catalog untuk {args.merchant} (found: {len(catalogs)})")
            print(f"    Pattern: captures/{args.merchant}*.endpoints.json")
        return 0

    old = _load(catalogs[-2])
    new = _load(catalogs[-1])

    drift = compute_drift(old, new)

    out_path = CAPTURES / f"drift_{args.merchant}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(drift, f, indent=2, ensure_ascii=False, default=str)

    if not args.quiet:
        print(f"[*] Drift report saved → {out_path}")
        print(f"    Added       : {len(drift['added'])}")
        print(f"    Removed     : {len(drift['removed'])}")
        print(f"    Schema chg  : {len(drift['field_changes'])}")
        print(f"    Auth chg    : {len(drift['auth_changes'])}")
        print(f"    Has drift   : {drift['has_drift']}")

    if args.notify and drift["has_drift"]:
        text = _format_telegram(drift)
        sent = asyncio.run(_notify(text))
        if not args.quiet:
            print(f"[*] Telegram notify: {'sent' if sent else 'skipped (not configured)'}")

    return 0 if not drift["has_drift"] else 2  # exit 2 = drift detected (for CI to flag)


if __name__ == "__main__":
    sys.exit(main())
