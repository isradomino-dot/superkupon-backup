"""Import JSON dumps ke Supabase PostgreSQL database setelah schema di-create via Alembic.

Usage:
    IMPORT_TARGET_DATABASE_URL=postgresql://... python scripts/import_from_json.py

Reads JSON files dari ./exports/ directory dan import per table dengan ID preservation
(buat preserve FK relationships). Truncate target table dulu sebelum import.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, "backend")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import Category, Coupon, CouponVote, Merchant, ScrapeLog


def get_engine():
    url = os.environ.get("IMPORT_TARGET_DATABASE_URL")
    if not url:
        print("ERROR: IMPORT_TARGET_DATABASE_URL env var not set")
        sys.exit(1)
    # Normalize ke psycopg v3 driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    return create_engine(url)


EXPORTS_DIR = Path("exports")

DATETIME_COLS = {
    "merchants": [],
    "categories": [],
    "coupons": ["expires_at", "scraped_at", "verified_at"],
    "scrape_logs": ["started_at", "finished_at"],
    "coupon_votes": ["created_at"],
}


def parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        print(f"  ! Failed to parse datetime {value!r}: {exc}")
        return None


# (filename, Model class, table_name) — order matters for FK dependencies
IMPORT_ORDER = [
    ("merchants.json", Merchant, "merchants"),
    ("categories.json", Category, "categories"),
    ("coupons.json", Coupon, "coupons"),
    ("scrape_logs.json", ScrapeLog, "scrape_logs"),
    ("coupon_votes.json", CouponVote, "coupon_votes"),
]


def import_table(session, filename, Model, table_name):
    path = EXPORTS_DIR / filename
    if not path.exists():
        print(f"  - {filename} not found, skipping")
        return 0

    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"  X Failed to parse {filename}: {exc}")
        return 0

    if not rows:
        print(f"  - {table_name}: 0 rows (skip)")
        return 0

    # Convert ISO datetime strings ke datetime objects
    dt_cols = DATETIME_COLS.get(table_name, [])
    for row in rows:
        for col in dt_cols:
            if col in row and row[col] is not None:
                row[col] = parse_datetime(row[col])

    # Truncate target table (CASCADE biar FK constraints gak block)
    session.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
    session.commit()

    # Bulk insert per batch 500 rows
    BATCH = 500
    total = len(rows)
    for i in range(0, total, BATCH):
        batch = rows[i : i + BATCH]
        session.bulk_insert_mappings(Model, batch)
        session.commit()
        print(f"    inserted {min(i + BATCH, total)}/{total}")

    # Reset sequence buat auto-increment IDs (biar next insert gak collision)
    max_id = session.execute(
        text(f"SELECT COALESCE(MAX(id), 0) FROM {table_name}")
    ).scalar()
    if max_id and max_id > 0:
        session.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                f"{max_id}, true)"
            )
        )
        session.commit()
        print(f"    sequence reset to {max_id}")

    print(f"  OK {table_name}: {total} rows imported")
    return total


def main():
    print(f"Import target: {os.environ.get('IMPORT_TARGET_DATABASE_URL', '')[:50]}...")
    print(f"Exports dir: {EXPORTS_DIR.resolve()}\n")

    if not EXPORTS_DIR.exists():
        print(f"ERROR: {EXPORTS_DIR} directory not found")
        sys.exit(1)

    engine = get_engine()
    Session = sessionmaker(bind=engine)
    session = Session()

    total_imported = 0
    errors = []

    for filename, Model, table_name in IMPORT_ORDER:
        print(f"[{table_name}]")
        try:
            count = import_table(session, filename, Model, table_name)
            total_imported += count
        except Exception as exc:
            session.rollback()
            err = f"{table_name}: {type(exc).__name__}: {exc}"
            print(f"  X ERROR {err}")
            errors.append(err)
        print()

    session.close()

    print("=" * 60)
    print(f"Total rows imported: {total_imported}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(2)
    else:
        print("All tables imported successfully")


if __name__ == "__main__":
    main()
