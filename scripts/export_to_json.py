"""
Export all SuperKupon DB data from PRODUCTION (Railway PostgreSQL) to JSON files
ready for import into Supabase.

Usage:
    export EXPORT_SOURCE_DATABASE_URL="postgresql://user:pass@host:port/db"
    python scripts/export_to_json.py

Output:
    exports/merchants.json
    exports/categories.json
    exports/coupons.json
    exports/scrape_logs.json
    exports/coupon_votes.json
"""

import json
import os
import sys
import time
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path

# Ensure backend/ is importable so `app.models` resolves
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def _get_db_url() -> str:
    url = os.environ.get("EXPORT_SOURCE_DATABASE_URL")
    if not url:
        raise RuntimeError(
            "EXPORT_SOURCE_DATABASE_URL env var is required. "
            "Set it to your Railway PostgreSQL URL."
        )
    # Normalize Railway URL to psycopg3 driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


def serialize(value):
    """Convert SQLAlchemy column values to JSON-safe types."""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def model_to_dict(obj) -> dict:
    return {c.name: serialize(getattr(obj, c.name)) for c in obj.__table__.columns}


def main() -> int:
    start = time.time()

    # Import models lazily so import errors surface clearly
    from app.models import Merchant, Category, Coupon, ScrapeLog

    # CouponVote may not exist on older deploys — handle gracefully
    try:
        from app.models import CouponVote  # type: ignore
    except ImportError:
        CouponVote = None

    url = _get_db_url()
    engine = create_engine(url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    exports_dir = PROJECT_ROOT / "exports"
    exports_dir.mkdir(exist_ok=True)

    targets = [
        ("merchants.json", Merchant),
        ("categories.json", Category),
        ("coupons.json", Coupon),
        ("scrape_logs.json", ScrapeLog),
    ]
    if CouponVote is not None:
        targets.append(("coupon_votes.json", CouponVote))

    total_rows = 0
    try:
        for filename, model in targets:
            try:
                rows = session.query(model).all()
            except Exception as e:
                # Table may not exist in this DB — skip but log
                print(f"! Skipped {filename}: {e.__class__.__name__}: {e}")
                session.rollback()
                continue

            data = [model_to_dict(r) for r in rows]
            out_path = exports_dir / filename
            out_path.write_text(
                json.dumps(data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            total_rows += len(data)
            print(f"✓ Exported {filename}: {len(data)} rows")
    finally:
        session.close()
        engine.dispose()

    duration = time.time() - start
    print(f"\nTotal: {total_rows} rows exported in {duration:.2f}s")
    print(f"Output dir: {exports_dir}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"ERROR: {e.__class__.__name__}: {e}", file=sys.stderr)
        sys.exit(1)
