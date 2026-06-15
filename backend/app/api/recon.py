"""Admin endpoint untuk recon results — list endpoint catalog, audit log, sample response."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api._auth import require_admin

router = APIRouter(
    prefix="/admin/recon",
    tags=["admin-recon"],
    dependencies=[Depends(require_admin)],
)

RECON_DIR = Path(__file__).resolve().parent.parent.parent / "recon"
CAPTURES_DIR = RECON_DIR / "captures"
AUDIT_LOG = CAPTURES_DIR / "audit.jsonl"


@router.get("/sessions")
def list_sessions():
    """List semua recon session berdasarkan audit log."""
    if not AUDIT_LOG.exists():
        return {"sessions": [], "total": 0, "note": "No recon sessions logged yet."}

    sessions: list[dict[str, Any]] = []
    with open(AUDIT_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    sessions.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    sessions.sort(key=lambda s: s.get("ts", ""), reverse=True)
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/catalogs")
def list_catalogs():
    """List endpoint catalog yang sudah di-parse."""
    if not CAPTURES_DIR.exists():
        return {"catalogs": []}

    catalogs: list[dict[str, Any]] = []
    for p in CAPTURES_DIR.glob("*.endpoints.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                cat = json.load(f)
            catalogs.append({
                "file": p.name,
                "merchant": cat.get("merchant"),
                "endpoint_count": len(cat.get("in_scope_endpoints", [])),
                "source_capture": cat.get("source_capture"),
            })
        except (json.JSONDecodeError, OSError):
            continue

    return {"catalogs": catalogs}


@router.get("/catalogs/{filename}")
def get_catalog(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(400, "Invalid filename")

    p = CAPTURES_DIR / filename
    if not p.exists() or not p.is_file():
        raise HTTPException(404, f"Catalog not found: {filename}")

    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/scope-summary")
def scope_summary():
    """Summary scope compliance — berapa session in/out of scope."""
    if not AUDIT_LOG.exists():
        return {"sessions": 0, "in_scope_total": 0, "out_of_scope_total": 0}

    in_scope = out_of_scope = sessions = 0
    by_merchant: dict[str, dict[str, int]] = {}

    with open(AUDIT_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            sessions += 1
            in_scope += rec.get("in_scope", 0)
            out_of_scope += rec.get("out_of_scope", 0)
            for m in rec.get("merchants_seen", []):
                by_merchant.setdefault(m, {"in_scope": 0, "out_of_scope": 0})

    return {
        "sessions": sessions,
        "in_scope_total": in_scope,
        "out_of_scope_total": out_of_scope,
        "merchants_seen": sorted(by_merchant.keys()),
        "scope_ratio": (
            round(in_scope / (in_scope + out_of_scope), 3)
            if (in_scope + out_of_scope) > 0
            else None
        ),
    }
