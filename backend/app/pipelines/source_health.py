"""Source health tracking — score per scraper berdasarkan ScrapeLog history.

Healthy source = success rate tinggi + items_found stabil.
Failing source = auto-disable suggestion ke admin.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import ScrapeLog


def compute_source_health(db: Session, days: int = 7) -> list[dict[str, Any]]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(ScrapeLog)
        .filter(ScrapeLog.started_at >= cutoff)
        .order_by(ScrapeLog.started_at.desc())
        .all()
    )

    by_target: dict[str, list[ScrapeLog]] = defaultdict(list)
    for log in logs:
        by_target[log.target_id].append(log)

    out: list[dict[str, Any]] = []
    for target_id, target_logs in by_target.items():
        total = len(target_logs)
        succ = sum(1 for l in target_logs if l.status == "success")
        failed = sum(1 for l in target_logs if l.status == "failed")
        success_rate = succ / total if total else 0

        recent_items = [l.items_found for l in target_logs[:10] if l.items_found > 0]
        avg_items = sum(recent_items) / len(recent_items) if recent_items else 0

        last_success = next((l for l in target_logs if l.status == "success"), None)
        hours_since_success = (
            (datetime.utcnow() - last_success.started_at).total_seconds() / 3600
            if last_success
            else None
        )

        health_score = int(success_rate * 100)
        if hours_since_success and hours_since_success > 48:
            health_score = max(0, health_score - 30)
        if avg_items == 0 and total >= 3:
            health_score = max(0, health_score - 20)

        status = "healthy" if health_score >= 70 else "degraded" if health_score >= 30 else "failing"

        out.append({
            "target_id": target_id,
            "runs_7d": total,
            "success_count": succ,
            "failed_count": failed,
            "success_rate": round(success_rate, 3),
            "avg_items_found": round(avg_items, 1),
            "hours_since_last_success": round(hours_since_success, 1) if hours_since_success else None,
            "health_score": health_score,
            "status": status,
            "recommendation": _recommend(status, hours_since_success, avg_items),
        })

    return sorted(out, key=lambda x: x["health_score"])


def _recommend(status: str, hours_since: float | None, avg_items: float) -> str:
    if status == "failing":
        if hours_since and hours_since > 48:
            return "🚨 No success in 48h — investigate / re-recon endpoint"
        if avg_items == 0:
            return "🚨 0 items extracted — selector likely broken, check parser"
        return "🚨 Multiple failures — review error logs"
    if status == "degraded":
        return "⚠️ Inconsistent — monitor closely, may need re-recon soon"
    return "✅ Operating normally"
