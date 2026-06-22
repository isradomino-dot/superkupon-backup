import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.db import SessionLocal
from app.models import ScrapeLog
from app.pipelines.dedup import upsert_coupons
from app.pipelines.lifecycle import run_lifecycle
from app.scrapers.registry import all_scrapers, get_scraper
from app.services.email_digest import send_weekly_digest

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Jakarta")


async def run_scraper(target_id: str) -> dict:
    """Eksekusi 1 scraper, simpan ScrapeLog, return summary."""
    scraper = get_scraper(target_id)
    if not scraper:
        return {"status": "failed", "error": f"unknown target_id: {target_id}"}

    db = SessionLocal()
    log = ScrapeLog(
        target_id=target_id,
        started_at=datetime.utcnow(),
        status="running",
    )
    db.add(log)
    db.commit()

    try:
        items = await scraper.run()
        new_count, updated_count = upsert_coupons(db, items)

        log.finished_at = datetime.utcnow()
        log.status = "success"
        log.items_found = len(items)
        log.items_new = new_count
        log.items_updated = updated_count
        db.commit()

        logger.info(
            f"[{target_id}] success: found={len(items)} new={new_count} updated={updated_count}"
        )

        return {
            "target_id": target_id,
            "status": "success",
            "items_found": len(items),
            "items_new": new_count,
            "items_updated": updated_count,
        }
    except Exception as e:
        log.finished_at = datetime.utcnow()
        log.status = "failed"
        log.error = str(e)
        db.commit()
        logger.exception(f"[{target_id}] failed: {e}")
        return {"target_id": target_id, "status": "failed", "error": str(e)}
    finally:
        db.close()


def register_all_jobs() -> None:
    for scraper in all_scrapers():
        scheduler.add_job(
            run_scraper,
            trigger=IntervalTrigger(minutes=scraper.interval_minutes),
            args=[scraper.target_id],
            id=f"scrape_{scraper.target_id}",
            replace_existing=True,
            next_run_time=datetime.now(),
        )
        logger.info(
            f"Registered scrape job: {scraper.target_id} (every {scraper.interval_minutes} min)"
        )

    scheduler.add_job(
        run_lifecycle,
        trigger=IntervalTrigger(minutes=30),
        id="lifecycle_auto_expire",
        replace_existing=True,
    )
    logger.info("Registered lifecycle job: auto-expire (every 30 min)")

    # Weekly email digest — Senin 01:00 UTC = 08:00 WIB
    # Safety: send_weekly_digest() internally check settings.DIGEST_ENABLED
    # supaya cron tetap registered tapi gak ngirim kalau flag mati.
    def _digest_job_wrapper():
        recipients = [
            r.strip()
            for r in (settings.DIGEST_RECIPIENTS or "").split(",")
            if r and r.strip()
        ]
        return send_weekly_digest(recipients or None)

    scheduler.add_job(
        _digest_job_wrapper,
        trigger=CronTrigger(day_of_week="mon", hour=1, minute=0, timezone="UTC"),
        id="email_weekly_digest",
        replace_existing=True,
    )
    logger.info(
        "Registered email digest job: weekly (Mon 01:00 UTC / 08:00 WIB) — "
        f"enabled={settings.DIGEST_ENABLED}"
    )


def start_scheduler() -> None:
    register_all_jobs()
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
