"""Reverse helper untuk output hmac_decoder.js.

Parses log JSON-per-line, cluster panggilan HMAC, infer signing scheme:
  - Key constant atau derived dari token/device_id?
  - Payload format: METHOD|PATH|TS|BODY_HASH? atau pattern lain?
  - Algorithm: HMAC-SHA256 vs SHA1 vs MD5?

Output:
  - Summary statistik
  - Rekomendasi reproduce strategy untuk _sign_request() di Python scraper

Usage:
    python -m recon.analyzer.signature_reverser <hmac_log.jsonl> [--merchant dana]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


PAYLOAD_PATTERN_HINTS: list[tuple[str, str]] = [
    (r"^(GET|POST|PUT|DELETE|PATCH)\|/[\w/\-_.]+\|\d{10,13}", "METHOD|PATH|TIMESTAMP"),
    (r"^(GET|POST|PUT|DELETE|PATCH)\|/[\w/\-_.]+\|\d{10,13}\|[0-9a-f]{32,}", "METHOD|PATH|TS|BODY_HASH"),
    (r"^/[\w/\-_.]+\|\d{10,13}", "PATH|TIMESTAMP"),
    (r"^\d{10,13}\|/[\w/\-_.]+", "TIMESTAMP|PATH"),
    (r'^\{.*\}$', "JSON_BODY"),
    (r"^[a-zA-Z0-9_-]+=", "QUERY_STRING"),
]


def parse_log(path: Path) -> list[dict[str, Any]]:
    records = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = re.search(r"\[HMAC\]\s*(\{.*\})", line)
            payload = m.group(1) if m else (line if line.startswith("{") else None)
            if not payload:
                continue
            try:
                rec = json.loads(payload)
                records.append(rec)
            except json.JSONDecodeError:
                continue
    return records


def infer_payload_pattern(payload_utf8: str | None) -> str:
    if not payload_utf8:
        return "binary"
    for pattern, label in PAYLOAD_PATTERN_HINTS:
        if re.match(pattern, payload_utf8):
            return label
    return "unknown"


def analyze(records: list[dict[str, Any]]) -> dict[str, Any]:
    hmac_records = [r for r in records if r.get("kind") not in {"digest", "key-construct"}]
    digest_records = [r for r in records if r.get("kind") == "digest"]
    key_constructs = [r for r in records if r.get("kind") == "key-construct"]

    algos = Counter(r.get("algo", "?") for r in hmac_records)
    keys_seen = Counter(r.get("key_hex", "?") for r in hmac_records if r.get("key_hex"))
    pattern_counter: Counter[str] = Counter()
    pattern_samples: dict[str, list[str]] = defaultdict(list)

    for r in hmac_records:
        p = infer_payload_pattern(r.get("payload_utf8"))
        pattern_counter[p] += 1
        if len(pattern_samples[p]) < 3:
            sample = r.get("payload_utf8") or r.get("payload_hex", "")[:80]
            pattern_samples[p].append(sample)

    key_constants = [k for k, n in keys_seen.items() if n >= 2 and k != "unknown"]
    key_dynamic = [k for k, n in keys_seen.items() if n == 1]

    inference: dict[str, Any] = {
        "total_hmac_calls": len(hmac_records),
        "total_digest_calls": len(digest_records),
        "total_key_constructs": len(key_constructs),
        "algorithms": dict(algos),
        "unique_keys": len(keys_seen),
        "key_constant_candidates": key_constants[:5],
        "key_seen_only_once": len(key_dynamic),
        "payload_patterns": dict(pattern_counter),
        "payload_samples": dict(pattern_samples),
        "key_constructs_seen": [
            {
                "algo": k.get("algo"),
                "key_utf8_preview": (k.get("key_utf8") or "")[:64],
                "key_hex_len": len(k.get("key_hex", "")),
            }
            for k in key_constructs[:5]
        ],
    }

    if key_constants:
        inference["key_strategy"] = "constant (likely hardcoded or single-derive)"
        inference["python_key_source"] = (
            f'settings.{(inference.get("merchant", "MERCHANT") or "MERCHANT").upper()}_SIGNING_KEY  # hex={key_constants[0][:16]}...'
        )
    elif key_dynamic and not key_constants:
        inference["key_strategy"] = "dynamic (likely derived from token/device per session)"
        inference["python_key_source"] = "self._derive_signing_key()  # ⚠️ reverse derivation needed"

    if pattern_counter:
        top_pattern = pattern_counter.most_common(1)[0][0]
        inference["most_common_payload_pattern"] = top_pattern
        inference["python_payload_template"] = _payload_template_for(top_pattern)

    return inference


def _payload_template_for(pattern: str) -> str:
    return {
        "METHOD|PATH|TIMESTAMP": (
            'payload = f"{method}|{path}|{ts_ms}"'
        ),
        "METHOD|PATH|TS|BODY_HASH": (
            'body_hash = hashlib.md5(body.encode()).hexdigest()\n'
            '    payload = f"{method}|{path}|{ts_ms}|{body_hash}"'
        ),
        "PATH|TIMESTAMP": 'payload = f"{path}|{ts_ms}"',
        "TIMESTAMP|PATH": 'payload = f"{ts_ms}|{path}"',
        "JSON_BODY": 'payload = body_json  # sign raw JSON body',
        "QUERY_STRING": 'payload = urlencode(sorted(params.items()))',
        "binary": '# Binary payload — likely protobuf or msgpack; inspect chunks manually',
        "unknown": '# Pattern not recognized — inspect payload_samples manually',
    }.get(pattern, "# pattern unknown")


def render_python_snippet(inference: dict[str, Any], merchant: str) -> str:
    algo = next(iter(inference.get("algorithms", {})), "HmacSHA256")
    algo_py = algo.replace("Hmac", "").replace("hmac", "").lower() or "sha256"

    return f'''
# Suggested _sign_request() implementation untuk {merchant.upper()}
# Disusun otomatis dari hmac_decoder log — REVIEW SEBELUM PRODUCTION
import hmac
import hashlib
import time

def _sign_request(self, method: str, path: str, body: str = "") -> dict[str, str]:
    """Reproduce HMAC signing scheme dari capture.

    Pattern terdeteksi: {inference.get("most_common_payload_pattern", "unknown")}
    Key strategy: {inference.get("key_strategy", "unknown")}
    Algorithm: {algo}
    """
    ts_ms = int(time.time() * 1000)

    {inference.get("python_payload_template", "# pattern unknown")}

    key = {inference.get("python_key_source", "settings.SIGNING_KEY")}
    if isinstance(key, str):
        key = bytes.fromhex(key) if all(c in "0123456789abcdef" for c in key.lower()) else key.encode()

    signature = hmac.new(key, payload.encode(), hashlib.{algo_py}).hexdigest()

    return {{
        "X-Signature": signature,
        "X-Timestamp": str(ts_ms),
    }}
'''


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reverse HMAC signing scheme dari hmac_decoder.js log")
    parser.add_argument("input", help="Path ke hmac_log.jsonl")
    parser.add_argument("--merchant", default="merchant", help="Merchant slug untuk output snippet")
    parser.add_argument("--snippet", action="store_true", help="Print Python snippet usulan")
    args = parser.parse_args(argv)

    src = Path(args.input)
    if not src.exists():
        print(f"[!] File not found: {src}", file=sys.stderr)
        return 1

    records = parse_log(src)
    print(f"[*] Parsed {len(records)} HMAC log entries")

    if not records:
        print("[!] No HMAC records — pastikan hmac_decoder.js ke-attach saat capture")
        return 1

    inference = analyze(records)
    inference["merchant"] = args.merchant

    print("\n--- Inference ---")
    for k, v in inference.items():
        if k == "payload_samples":
            print(f"  {k}:")
            for pat, samples in v.items():
                print(f"    [{pat}]")
                for s in samples:
                    print(f"      {s[:120]}")
        else:
            print(f"  {k}: {v}")

    if args.snippet:
        print("\n--- Python snippet usulan ---")
        print(render_python_snippet(inference, args.merchant))

    print("\n[!] Verify manually — output ini hasil heuristik, bukan jaminan signing scheme akurat.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
