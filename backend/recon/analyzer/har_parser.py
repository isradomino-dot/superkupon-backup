"""Parse HAR (HTTP Archive) atau session_*.jsonl dari addon_capture.py."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator, Any
from dataclasses import dataclass, field


@dataclass
class CapturedRequest:
    method: str
    url: str
    path: str
    host: str
    query: dict[str, str]
    request_headers: dict[str, str]
    request_body: str | None
    response_status: int | None
    response_headers: dict[str, str]
    response_body: Any  # may be dict, list, str, or None

    merchant_hint: str | None = None
    tier: str = "unknown"
    notes: list[str] = field(default_factory=list)

    @property
    def signature_key(self) -> str:
        return f"{self.method}|{self.host}{self.path.split('?')[0]}"


def parse_har(path: Path) -> Iterator[CapturedRequest]:
    """Standard HAR 1.2 parser (mitmproxy export)."""
    with open(path, "r", encoding="utf-8") as f:
        har = json.load(f)

    for entry in har.get("log", {}).get("entries", []):
        req = entry["request"]
        res = entry.get("response", {})

        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(req["url"])
        query = {k: v[0] for k, v in parse_qs(parsed.query).items()}

        req_headers = {h["name"]: h["value"] for h in req.get("headers", [])}
        res_headers = {h["name"]: h["value"] for h in res.get("headers", [])}

        req_body = (req.get("postData") or {}).get("text")
        res_text = (res.get("content") or {}).get("text")
        res_body: Any = None
        if res_text:
            try:
                res_body = json.loads(res_text)
            except (json.JSONDecodeError, TypeError):
                res_body = res_text[:4096]

        yield CapturedRequest(
            method=req["method"],
            url=req["url"],
            path=parsed.path,
            host=parsed.netloc,
            query=query,
            request_headers=req_headers,
            request_body=req_body,
            response_status=res.get("status"),
            response_headers=res_headers,
            response_body=res_body,
        )


def parse_jsonl(path: Path) -> Iterator[CapturedRequest]:
    """Parse output session_*.jsonl dari addon_capture.py."""
    from urllib.parse import urlparse, parse_qs

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            parsed = urlparse(rec["url"])
            query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            yield CapturedRequest(
                method=rec["method"],
                url=rec["url"],
                path=parsed.path,
                host=parsed.netloc,
                query=query,
                request_headers=rec.get("request_headers", {}),
                request_body=rec.get("request_body_sample"),
                response_status=rec.get("response_status"),
                response_headers=rec.get("response_headers", {}),
                response_body=rec.get("response_body"),
                merchant_hint=rec.get("merchant"),
            )


def parse_any(path: Path) -> Iterator[CapturedRequest]:
    if path.suffix.lower() == ".har":
        yield from parse_har(path)
    elif path.suffix.lower() == ".jsonl":
        yield from parse_jsonl(path)
    else:
        raise ValueError(f"Unsupported format: {path.suffix} (expected .har or .jsonl)")


def dedup(requests: Iterator[CapturedRequest]) -> list[CapturedRequest]:
    """Dedupe by method+path. Prefer entry with non-empty response."""
    by_key: dict[str, CapturedRequest] = {}
    for r in requests:
        key = r.signature_key
        if key not in by_key:
            by_key[key] = r
        else:
            existing = by_key[key]
            if not existing.response_body and r.response_body:
                by_key[key] = r
    return list(by_key.values())
