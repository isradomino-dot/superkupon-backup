# PostgreSQL Migration — SQLite → Postgres

## Kapan migrate?

- ✅ Data > 50k coupons
- ✅ Multi-instance backend (perlu shared DB)
- ✅ Production deploy (SQLite tidak production-grade)
- ✅ Butuh full-text search advanced (Postgres `tsvector`)

## Setup Lokal (Docker Compose)

`docker-compose.yml` sudah include service postgres. Aktifkan:

```powershell
cd D:\Users\user27\coupon-aggregator

# Start postgres + backend + web
docker compose up -d postgres
docker compose logs -f postgres   # tunggu sampai "ready to accept connections"
```

Set `.env`:
```
DATABASE_URL=postgresql+psycopg://coupon:coupon@localhost:5432/coupon
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

## Run Migration

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt   # install psycopg + alembic

# Apply semua migration
alembic upgrade head

# Verifikasi
alembic current
```

## Workflow Migration Baru

Saat ubah model SQLAlchemy:

```powershell
# 1. Edit app/models.py — tambah/ubah field
# 2. Generate migration otomatis
alembic revision --autogenerate -m "add_user_voted_field"

# 3. Review file di alembic/versions/XXXX_add_user_voted_field.py
#    — SEMENTARA pasti perlu adjustment manual (alembic autogen tidak sempurna)

# 4. Apply
alembic upgrade head

# 5. Rollback kalau perlu
alembic downgrade -1
```

## Migrasi Data SQLite → Postgres

Kalau lo punya data existing di SQLite dev yang mau di-port:

```powershell
# Option 1: pgloader (recommended)
docker run --rm -v ${PWD}\backend:/data dimitri/pgloader `
  pgloader sqlite:///data/coupon.db postgresql://coupon:coupon@host.docker.internal:5432/coupon

# Option 2: manual dump (untuk dataset kecil)
python -c "
from app.db import SessionLocal
from app.models import Coupon, Merchant, Category
import json
db = SessionLocal()
data = {
    'merchants': [{...} for m in db.query(Merchant).all()],
    'categories': [...],
    'coupons': [...],
}
with open('dump.json', 'w') as f:
    json.dump(data, f, default=str)
"
# Lalu switch DATABASE_URL ke postgres + script restore
```

## Production Tuning

```sql
-- Tambah index untuk query yang sering
CREATE INDEX CONCURRENTLY idx_coupons_active_recent
  ON coupons (status, scraped_at DESC)
  WHERE status = 'active';

-- Full-text search index (BONUS)
ALTER TABLE coupons ADD COLUMN search_vector tsvector;
UPDATE coupons SET search_vector =
  to_tsvector('indonesian', coalesce(title, '') || ' ' || coalesce(description, ''));
CREATE INDEX idx_coupons_search ON coupons USING gin(search_vector);

-- Auto-update search_vector via trigger
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
  ON coupons FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.indonesian', title, description);
```

## Connection Pooling (production)

Untuk traffic tinggi, di depan Postgres pakai PgBouncer:

```yaml
# docker-compose.yml tambah service:
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DATABASE_URL: postgresql://coupon:coupon@postgres:5432/coupon
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 200
  ports:
    - "6432:5432"
```

Backend connect ke `localhost:6432` instead of `5432`.

## Monitoring

```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Active connections
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity WHERE state != 'idle';

-- Table bloat
SELECT relname, n_dead_tup, n_live_tup
FROM pg_stat_user_tables WHERE n_dead_tup > 1000;
```
