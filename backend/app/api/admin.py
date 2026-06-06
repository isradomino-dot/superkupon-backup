from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ScrapeLog
from app.schemas import ScrapeLogOut
from app.scrapers.registry import REGISTRY
from app.scheduler import run_scraper

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/scrapers")
def list_scrapers():
    return [
        {
            "target_id": cls.target_id,
            "name": cls.name,
            "merchant_slug": cls.merchant_slug,
            "interval_minutes": cls.interval_minutes,
            "tier": cls.tier,
            "enabled": cls.enabled,
        }
        for cls in REGISTRY.values()
    ]


@router.post("/scrape/{target_id}")
async def trigger_scrape(target_id: str):
    if target_id not in REGISTRY:
        raise HTTPException(404, f"Unknown target_id: {target_id}")
    return await run_scraper(target_id)


@router.post("/scrape-all")
async def trigger_scrape_all():
    results = []
    for target_id in REGISTRY.keys():
        results.append(await run_scraper(target_id))
    return {"results": results}


@router.get("/scrape-logs", response_model=List[ScrapeLogOut])
def list_logs(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(ScrapeLog)
        .order_by(ScrapeLog.started_at.desc())
        .limit(limit)
        .all()
    )
