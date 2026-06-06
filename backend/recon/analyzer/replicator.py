"""Generate Python scraper code dari endpoint catalog."""
from __future__ import annotations

import json
import textwrap
from pathlib import Path
from typing import Any


SCRAPER_TEMPLATE = '''"""
Auto-generated mobile scraper — {merchant_name}
Source endpoint: {url}
Generated from: {source_catalog}

⚠️  REVIEW BEFORE PRODUCTION USE:
  - Lihat {auth_notes}
  - Set token & secret di .env (lihat bagian _get_auth_token below)
  - Sesuaikan interval_minutes conservative (default 120 min)
  - Test dulu dengan SCRAPER_USE_MOCK=true sebelum live
"""
from __future__ import annotations

import asyncio
import random
from datetime import datetime
from typing import Any, List

import httpx

from app.config import settings
from app.scrapers.base import BaseScraper
from app.schemas import CouponRaw


class {class_name}(BaseScraper):
    target_id = "{target_id}"
    merchant_slug = "{merchant_slug}"
    name = "{merchant_name} (mobile API recon)"
    interval_minutes = 120
    tier = "gray"  # endpoint reconstructed dari mobile recon — bukan affiliate API resmi

    ENDPOINT_URL = "{url}"
    METHOD = "{method}"

    async def _get_auth_token(self) -> str:
        """Token dari akun test sendiri.

        Simpan di .env sebagai {env_token_name}.
        ⚠️  JANGAN automated login flow — boundary di recon/LEGAL_BOUNDARIES.md.
        """
        token = getattr(settings, "{env_token_name}", None) or ""
        if not token:
            raise RuntimeError(
                "{env_token_name} not set in .env — manual refresh diperlukan dari akun test."
            )
        return token

    def _build_headers(self) -> dict[str, str]:
        return {{
{header_lines}
        }}

    async def fetch_raw(self) -> dict | list:
        if settings.SCRAPER_USE_MOCK:
            return {sample_response_repr}

        await asyncio.sleep(random.uniform(2.0, 8.0))  # jitter

        async with httpx.AsyncClient(timeout=settings.SCRAPER_TIMEOUT_SECONDS) as client:
            resp = await client.request(
                self.METHOD,
                self.ENDPOINT_URL,
                headers=self._build_headers(),
            )
            resp.raise_for_status()
            return resp.json()

    def parse(self, raw: Any) -> List[CouponRaw]:
        items: List[CouponRaw] = []
        rows = {rows_extractor}

        for row in rows or []:
            items.append(
                CouponRaw(
                    code={code_extractor},
                    title={title_extractor},
                    description={description_extractor},
                    discount_type={discount_type_extractor},
                    discount_value={discount_value_extractor},
                    min_spend={min_spend_extractor},
                    max_discount={max_discount_extractor},
                    merchant_slug=self.merchant_slug,
                    expires_at={expires_at_extractor},
                    source_url=self.ENDPOINT_URL,
                    source_target=self.target_id,
                )
            )
        return items
'''


def _jsonpath_to_python(jsonpath: str) -> str:
    """Convert JSONPath sederhana ke chained .get() Python."""
    if not jsonpath or not jsonpath.startswith("$"):
        return "None"

    parts = jsonpath[1:].lstrip(".").split(".")
    expr = "row"

    # Skip the `[*]` portion since `row` itu sudah per-item
    skip_until_array = False
    for p in parts:
        if "[*]" in p:
            skip_until_array = True
            field = p.replace("[*]", "")
            if field:
                expr = f'{expr}.get("{field}")'
            continue
        if skip_until_array:
            expr = f'{expr}.get("{p}") if isinstance({expr}, dict) else None'
            skip_until_array = False
        else:
            expr = f'{expr}.get("{p}")'

    return expr


def _rows_extractor_from_mapping(field_mapping: dict[str, str]) -> str:
    """Find common prefix yang berakhir di `[*]` — itu list container."""
    paths = [v for v in field_mapping.values() if "[*]" in v]
    if not paths:
        return "[raw] if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])"

    prefix = paths[0].split("[*]")[0]
    if prefix == "$":
        return "raw if isinstance(raw, list) else []"

    parts = prefix[1:].lstrip(".").split(".")
    expr = "raw"
    for p in parts:
        if p:
            expr = f'{expr}.get("{p}", []) if isinstance({expr}, dict) else []'
    return expr


def _normalize_value_extractor(jsonpath: str, kind: str = "any") -> str:
    base = _jsonpath_to_python(jsonpath)
    if kind == "float":
        return f"float({base} or 0)"
    if kind == "int":
        return f"int({base} or 0)"
    if kind == "datetime":
        return (
            f"datetime.fromisoformat(str({base}).replace('Z', '+00:00')) "
            f"if {base} else None"
        )
    if kind == "str_lower":
        return f"str({base} or '').lower()"
    return base


def generate_scraper_code(catalog: dict[str, Any], endpoint_id: str) -> str:
    endpoints = {e["id"]: e for e in catalog["in_scope_endpoints"]}
    if endpoint_id not in endpoints:
        raise KeyError(f"Endpoint id '{endpoint_id}' not in catalog")

    ep = endpoints[endpoint_id]
    merchant_slug = catalog["merchant"]
    merchant_name = merchant_slug.upper()
    class_name = f"{merchant_slug.title().replace('-', '').replace('_', '')}MobileScraper"

    mapping = ep.get("field_mapping", {})
    rows_extractor = _rows_extractor_from_mapping(mapping)

    headers = ep.get("request_headers_template", {})
    header_lines_list = []
    for k, v in headers.items():
        if k.lower() == "authorization":
            header_lines_list.append(f'            "{k}": f"Bearer {{await self._get_auth_token()}}",')
        else:
            esc_v = v.replace("\\", "\\\\").replace('"', '\\"')
            header_lines_list.append(f'            "{k}": "{esc_v}",')
    header_lines = "\n".join(header_lines_list) if header_lines_list else '            "Accept": "application/json",'

    sample = ep.get("sample_response_preview", {})
    try:
        sample_repr = json.dumps(sample, indent=12, ensure_ascii=False)
        sample_repr = textwrap.indent(sample_repr, "        ").lstrip()
    except Exception:
        sample_repr = "{}"

    code = SCRAPER_TEMPLATE.format(
        merchant_name=merchant_name,
        url=ep["url"],
        source_catalog=catalog.get("source_file", "(unknown)"),
        auth_notes="recon/playbooks/" + merchant_slug + ".md section 4 untuk auth flow",
        class_name=class_name,
        target_id=ep["id"],
        merchant_slug=merchant_slug,
        env_token_name=f"TOKEN_{merchant_slug.upper()}_TEST",
        header_lines=header_lines,
        sample_response_repr=sample_repr,
        rows_extractor=rows_extractor,
        method=ep.get("method", "GET"),
        code_extractor=_jsonpath_to_python(mapping.get("code", "")),
        title_extractor=_jsonpath_to_python(mapping.get("title", "")),
        description_extractor=_jsonpath_to_python(mapping.get("description", "")),
        discount_type_extractor=_normalize_value_extractor(mapping.get("discount_type", ""), "str_lower") + ' or "fixed"',
        discount_value_extractor=_normalize_value_extractor(mapping.get("discount_value", ""), "float"),
        min_spend_extractor=_normalize_value_extractor(mapping.get("min_spend", ""), "float") + " or None",
        max_discount_extractor=_normalize_value_extractor(mapping.get("max_discount", ""), "float") + " or None",
        expires_at_extractor=_normalize_value_extractor(mapping.get("expires_at", ""), "datetime"),
    )
    return code


def write_scraper(catalog_path: Path, endpoint_id: str, output_path: Path) -> Path:
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    catalog["source_file"] = catalog_path.name
    code = generate_scraper_code(catalog, endpoint_id)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(code)
    return output_path
