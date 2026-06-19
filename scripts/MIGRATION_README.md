# Migration ke Supabase — Step by Step

Panduan pindahin data dari Railway production ke Supabase. Bahasa simple, ikutin urut dari atas ke bawah.

## Prerequisites

Sebelum mulai, pastikan ini udah ready:

- Project Supabase aktif (project ref: `...`)
- DATABASE_URL Supabase + password udah tersimpan (catat di tempat aman, jangan ke-commit)
- Python 3.12+ terinstall
- Dependencies backend udah ke-install:
  ```bash
  cd backend
  pip install -r requirements.txt
  ```

## Step 1: Set Source + Target Env Vars

Buka terminal, set 2 env vars ini. Source = Railway (cuma dibaca), Target = Supabase (bakal di-write).

```bash
# Source = Railway production (READ-ONLY untuk export)
export EXPORT_SOURCE_DATABASE_URL='postgresql://postgres:RAILWAY_PASS@host/db'

# Target = Supabase (akan di-WRITE)
export IMPORT_TARGET_DATABASE_URL='postgresql+psycopg://postgres.REF:PASS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
```

Ganti `RAILWAY_PASS`, `REF`, dan `PASS` sesuai kredensial asli lo.

## Step 2: Run Alembic upgrade di Supabase

Bikin schema (tables + indexes + foreign keys) di Supabase. Tabel masih kosong abis step ini, cuma struktur doang.

```bash
cd backend
DATABASE_URL=$IMPORT_TARGET_DATABASE_URL alembic upgrade head
```

Output yang diharapin: ada beberapa baris `INFO [alembic.runtime.migration] Running upgrade ...` terus selesai tanpa error.

## Step 3: Export dari Railway

Tarik semua data production ke file JSON lokal.

```bash
cd ..
python scripts/export_to_json.py
```

Output yang muncul:
```
exports/merchants.json
exports/categories.json
exports/coupons.json
exports/scrape_logs.json
exports/coupon_votes.json
```

## Step 4: Import ke Supabase

Push data JSON tadi ke Supabase.

```bash
python scripts/import_from_json.py
```

Output yang diharapin:
```
✓ Imported merchants: 23 rows
✓ Imported categories: 8 rows
✓ Imported coupons: 167 rows
✓ Imported scrape_logs: ... rows
✓ Imported coupon_votes: ... rows
```

## Step 5: Verify

Sanity check biar yakin data masuk semua.

```bash
DATABASE_URL=$IMPORT_TARGET_DATABASE_URL python -c "
import sys; sys.path.insert(0, 'backend')
from app.db import SessionLocal
from app.models import Coupon
print(f'Coupons in Supabase: {SessionLocal().query(Coupon).count()}')
"
```

Jumlahnya harus sama dengan production count (167+). Kalau beda → ada yang gagal import, balik ke Step 4 cek logs.

## Step 6: Update backend/.env.backup pakai DATABASE_URL Supabase

Edit file `backend/.env.backup`, ganti `DATABASE_URL` ke connection string Supabase. Ini bakal dipake instance backup kalau Railway down.

## Step 7: Deploy backup ke Vercel pakai .env.backup

Upload env vars dari `.env.backup` ke Vercel project backup, terus trigger redeploy.

## Troubleshooting

| Error | Penyebab + Fix |
|-------|----------------|
| `Database does not exist` | Project Supabase belum Healthy. Buka dashboard, tunggu status hijau dulu. |
| `Connection refused` | Password salah di DATABASE_URL. Cek jangan ada placeholder `[YOUR-PASSWORD]` yang lupa diganti. |
| `Foreign key violation` | Urutan import salah. Harus `merchants` + `categories` DULU, baru `coupons`. Cek `import_from_json.py` urutannya. |
| `Duplicate key` | Tabel belum di-TRUNCATE sebelum import. Cek line di import script yang truncate, atau drop & rerun Alembic. |
