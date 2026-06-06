"""
mitmproxy addon — capture & filter promo recon traffic.

Usage:
    mitmweb -s recon/mitmproxy/addon_capture.py

Yang dilakukan addon ini:
  1. Load `filters.yaml` — daftar domain + in-scope path per merchant
  2. Untuk setiap response, klasifikasi: in-scope / out-of-scope / unknown
  3. Strip PII field dari response body sebelum disimpan
  4. Write summary ke `captures/audit.jsonl` (audit-able log)
  5. Auto-export HAR saat shutdown
"""
from __future__ import annotations

import json
import re
import time
import fnmatch
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml
from mitmproxy import ctx, http

ADDON_DIR = Path(__file__).resolve().parent
RECON_DIR = ADDON_DIR.parent
CAPTURES_DIR = RECON_DIR / "captures"
CAPTURES_DIR.mkdir(parents=True, exist_ok=True)


def _load_filters() -> dict[str, Any]:
    with open(ADDON_DIR / "filters.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _match_any(value: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(value, p) for p in patterns)


def _strip_pii(data: Any, pii_fields: list[str]) -> Any:
    if isinstance(data, dict):
        return {
            k: ("***REDACTED***" if k in pii_fields else _strip_pii(v, pii_fields))
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [_strip_pii(x, pii_fields) for x in data]
    return data


class CouponReconCapture:
    def __init__(self) -> None:
        self.filters = _load_filters()
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.audit_log_path = CAPTURES_DIR / "audit.jsonl"
        self.endpoint_dump_path = CAPTURES_DIR / f"session_{self.session_id}.jsonl"
        self.counters = {
            "in_scope": 0,
            "out_of_scope": 0,
            "untracked_domain": 0,
            "skipped_static": 0,
        }
        self.merchants_seen: set[str] = set()
        ctx.log.info(f"[recon] Capture session started: {self.session_id}")
        ctx.log.info(f"[recon] Tracking {len(self.filters['targets'])} target apps")

    def _classify(self, url: str) -> tuple[str, str | None]:
        """Return (status, merchant_slug). status = in_scope|out_of_scope|untracked."""
        for slug, cfg in self.filters["targets"].items():
            domain_match = any(d in url for d in cfg["domains"])
            if not domain_match:
                continue
            if _match_any(url, cfg.get("out_of_scope_paths", [])):
                return "out_of_scope", slug
            if _match_any(url, cfg.get("in_scope_paths", [])):
                return "in_scope", slug
            return "untracked", slug
        return "untracked", None

    def response(self, flow: http.HTTPFlow) -> None:
        url = flow.request.pretty_url
        if re.search(r"\.(png|jpg|jpeg|webp|gif|svg|css|js|woff2?)(\?|$)", url):
            self.counters["skipped_static"] += 1
            return

        status, merchant = self._classify(url)

        if status == "untracked" and merchant is None:
            self.counters["untracked_domain"] += 1
            return

        self.counters[status] += 1
        if merchant:
            self.merchants_seen.add(merchant)

        if status == "out_of_scope":
            ctx.log.warn(
                f"[recon] OUT_OF_SCOPE → {merchant}: {flow.request.method} {flow.request.path} "
                f"— NOT replicating, only logging for visibility"
            )
            return

        if status != "in_scope":
            return

        body_redacted: Any = None
        try:
            text = flow.response.get_text() if flow.response else None
            if text:
                payload = json.loads(text)
                body_redacted = _strip_pii(payload, self.filters["pii_fields"])
        except Exception:
            body_redacted = "<non-json or parse error>"

        record = {
            "ts": datetime.now().isoformat(),
            "session_id": self.session_id,
            "merchant": merchant,
            "tier": "in_scope",
            "method": flow.request.method,
            "url": url,
            "path": flow.request.path,
            "request_headers": dict(flow.request.headers),
            "request_body_sample": flow.request.get_text()[:2048] if flow.request.get_text() else None,
            "response_status": flow.response.status_code if flow.response else None,
            "response_headers": dict(flow.response.headers) if flow.response else {},
            "response_body": body_redacted,
        }

        with open(self.endpoint_dump_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        ctx.log.info(
            f"[recon] IN_SCOPE ✓ {merchant}: {flow.request.method} {flow.request.path} "
            f"→ status={record['response_status']}"
        )

    def done(self) -> None:
        summary = {
            "ts": datetime.now().isoformat(),
            "session_id": self.session_id,
            "duration_seconds": int(time.time() - int(self.session_id[-6:] or "0", 10) if self.session_id[-6:].isdigit() else 0),
            "merchants_seen": sorted(self.merchants_seen),
            **self.counters,
            "endpoint_dump": str(self.endpoint_dump_path.relative_to(RECON_DIR.parent)),
        }
        with open(self.audit_log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(summary, ensure_ascii=False) + "\n")

        ctx.log.info(f"[recon] Session done: {summary}")


addons = [CouponReconCapture()]
