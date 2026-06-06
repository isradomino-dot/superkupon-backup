"""CLI untuk recon analyzer.

Usage:
    python -m recon.analyzer.cli parse <input.har|.jsonl> [--output endpoints.json]
    python -m recon.analyzer.cli list <endpoints.json>
    python -m recon.analyzer.cli inspect <endpoints.json> --endpoint <id>
    python -m recon.analyzer.cli generate <endpoints.json> --endpoint <id> --merchant <slug> --output <file.py>
    python -m recon.analyzer.cli diff <old.json> <new.json>
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from recon.analyzer.har_parser import parse_any, dedup
from recon.analyzer.classifier import (
    classify,
    detect_merchant,
    detect_auth_strategy,
    extract_field_mapping,
    ALLOWED_TIERS,
)
from recon.analyzer.replicator import write_scraper


def _truncate_body(body: Any, max_chars: int = 1500) -> Any:
    s = json.dumps(body, ensure_ascii=False, default=str) if not isinstance(body, str) else body
    if len(s) > max_chars:
        return s[:max_chars] + "...[truncated]"
    return body


def cmd_parse(args: argparse.Namespace) -> int:
    src = Path(args.input)
    if not src.exists():
        print(f"[!] File not found: {src}", file=sys.stderr)
        return 1

    print(f"[*] Parsing {src}")
    captured = list(parse_any(src))
    print(f"[*] Found {len(captured)} requests")

    unique = dedup(iter(captured))
    print(f"[*] Deduped → {len(unique)} unique endpoints")

    counts: dict[str, int] = {}
    catalog_entries: list[dict[str, Any]] = []

    for r in unique:
        merchant = detect_merchant(r)
        tier = classify(r)
        counts[tier] = counts.get(tier, 0) + 1

        if tier not in ALLOWED_TIERS:
            continue

        auth = detect_auth_strategy(r)
        mapping = extract_field_mapping(r, tier)
        endpoint_id = f"{merchant or 'unknown'}_{tier.replace('-', '_')}_{r.path.strip('/').replace('/', '_')[:32]}"

        catalog_entries.append({
            "id": endpoint_id,
            "url": r.url,
            "method": r.method,
            "host": r.host,
            "path": r.path,
            "tier": tier,
            "merchant": merchant,
            "auth_strategy": auth,
            "request_headers_template": {
                k: v for k, v in r.request_headers.items()
                if k.lower() in {"user-agent", "accept", "accept-language", "content-type", "authorization"}
            },
            "field_mapping": mapping,
            "sample_response_preview": _truncate_body(r.response_body, 1500),
            "response_status": r.response_status,
        })

    print("[*] Classified:")
    for tier in ["promo-public", "marketing-feed", "merchant-catalog", "user-profile", "transaction", "auth", "unknown"]:
        n = counts.get(tier, 0)
        if n == 0:
            continue
        flag = "[⚠️  SKIPPED — out of scope]" if tier not in ALLOWED_TIERS and tier != "unknown" else ""
        print(f"    {tier:20s}: {n}  {flag}")

    catalog = {
        "merchant": next(iter({e["merchant"] for e in catalog_entries if e.get("merchant")}), "unknown"),
        "captured_at": None,
        "source_capture": str(src),
        "in_scope_endpoints": catalog_entries,
    }

    out = Path(args.output) if args.output else src.with_suffix(".endpoints.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False, default=str)
    print(f"[*] Saved {len(catalog_entries)} in-scope endpoints → {out}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    with open(args.catalog, "r", encoding="utf-8") as f:
        cat = json.load(f)

    print(f"Merchant: {cat['merchant']}")
    print(f"Total in-scope endpoints: {len(cat['in_scope_endpoints'])}\n")
    for e in cat["in_scope_endpoints"]:
        print(f"  [{e['tier']:18s}] {e['method']:6s} {e['url']}")
        print(f"     id={e['id']}")
        if e.get("auth_strategy", {}).get("bearer_token"):
            print(f"     auth=bearer", end="")
            if e["auth_strategy"].get("hmac_signature"):
                print(" + HMAC", end="")
            print()
        if e.get("field_mapping"):
            print(f"     fields={list(e['field_mapping'].keys())}")
        print()
    return 0


def cmd_inspect(args: argparse.Namespace) -> int:
    with open(args.catalog, "r", encoding="utf-8") as f:
        cat = json.load(f)
    for e in cat["in_scope_endpoints"]:
        if e["id"] == args.endpoint or e["path"] == args.endpoint:
            print(json.dumps(e, indent=2, ensure_ascii=False, default=str))
            return 0
    print(f"[!] Endpoint not found: {args.endpoint}", file=sys.stderr)
    return 1


def cmd_generate(args: argparse.Namespace) -> int:
    out = Path(args.output)
    written = write_scraper(Path(args.catalog), args.endpoint, out)
    print(f"[*] Generated scraper → {written}")
    print("[*] Next steps:")
    print(f"    1. Review {written} — adjust headers, signing logic")
    print(f"    2. Add to app/scrapers/registry.py")
    print(f"    3. Set TOKEN_{args.merchant.upper()}_TEST in .env from akun test refresh")
    print("    4. Test: POST http://localhost:8000/admin/scrape/<target_id>")
    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    with open(args.old, "r", encoding="utf-8") as f:
        old = json.load(f)
    with open(args.new, "r", encoding="utf-8") as f:
        new = json.load(f)
    old_ids = {e["id"]: e for e in old["in_scope_endpoints"]}
    new_ids = {e["id"]: e for e in new["in_scope_endpoints"]}

    added = set(new_ids) - set(old_ids)
    removed = set(old_ids) - set(new_ids)
    common = set(new_ids) & set(old_ids)

    print(f"+ Added   : {len(added)}")
    for i in added:
        print(f"    + {i}")
    print(f"- Removed : {len(removed)}")
    for i in removed:
        print(f"    - {i}")

    schema_changed = []
    for i in common:
        if old_ids[i].get("field_mapping") != new_ids[i].get("field_mapping"):
            schema_changed.append(i)
    print(f"~ Schema changed: {len(schema_changed)}")
    for i in schema_changed:
        print(f"    ~ {i}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="recon.analyzer", description="Coupon recon analyzer")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_parse = sub.add_parser("parse", help="Parse HAR/JSONL → endpoint catalog")
    p_parse.add_argument("input")
    p_parse.add_argument("--output", "-o")
    p_parse.set_defaults(func=cmd_parse)

    p_list = sub.add_parser("list", help="List endpoint dalam catalog")
    p_list.add_argument("catalog")
    p_list.set_defaults(func=cmd_list)

    p_insp = sub.add_parser("inspect", help="Print 1 endpoint detail")
    p_insp.add_argument("catalog")
    p_insp.add_argument("--endpoint", required=True)
    p_insp.set_defaults(func=cmd_inspect)

    p_gen = sub.add_parser("generate", help="Generate Python scraper dari endpoint")
    p_gen.add_argument("catalog")
    p_gen.add_argument("--endpoint", required=True)
    p_gen.add_argument("--merchant", required=True)
    p_gen.add_argument("--output", "-o", required=True)
    p_gen.set_defaults(func=cmd_generate)

    p_diff = sub.add_parser("diff", help="Diff dua catalog")
    p_diff.add_argument("old")
    p_diff.add_argument("new")
    p_diff.set_defaults(func=cmd_diff)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
