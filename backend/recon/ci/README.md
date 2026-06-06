# Recon CI — Endpoint Drift Detection

Otomatis cek apakah endpoint catalog (hasil recon) berubah schema-nya antar re-capture.

## Komponen

| File | Fungsi |
|------|--------|
| [`drift_notifier.py`](drift_notifier.py) | Compare 2 catalog terakhir, output diff JSON, optional Telegram notify |
| [`run_drift_check.ps1`](run_drift_check.ps1) | Scheduled task entry point — loop semua merchant |

## Setup Scheduled Task (Windows)

**Opsi A — Task Scheduler GUI:**
```
taskschd.msc → Create Basic Task
  Name: CouponReconDrift
  Trigger: Weekly, Monday 02:00
  Action: Start a program
    Program: powershell.exe
    Args:   -NoProfile -ExecutionPolicy Bypass -File "<PATH>\run_drift_check.ps1" -Notify
```

**Opsi B — schtasks (one-line):**
```powershell
schtasks /Create /SC WEEKLY /D MON /ST 02:00 /TN "CouponReconDrift" `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\Users\user27\coupon-aggregator\backend\recon\ci\run_drift_check.ps1 -Notify"
```

## Output

Setiap run:
1. Bandingkan `<merchant>*.endpoints.json` terakhir vs sebelumnya
2. Tulis `captures/drift_<merchant>_<ts>.json` dengan summary:
   - `added`: endpoint baru muncul
   - `removed`: endpoint hilang
   - `field_changes`: field schema berubah
   - `auth_changes`: auth/signature strategy berubah
3. Kalau `--notify` & ada drift → kirim Telegram message
4. Exit code: 0 (stable), 2 (drift), other (error)

## Workflow Recommended

```
                ┌─────────────────────────────────────┐
                │  Tiap 4 minggu — manual re-capture  │
                │  (lihat workflow/02_capture)        │
                └──────────────┬──────────────────────┘
                               │
                               ▼
                ┌──────────────────────────────────┐
                │  recon.analyzer.cli parse        │ ← generate new
                │  → <merchant>.endpoints.json     │   endpoints.json
                └──────────────┬───────────────────┘
                               │
                ┌──────────────▼──────────────────┐
                │  Weekly auto: drift_notifier    │ ← scheduled
                │  → diff vs prev catalog          │
                └──────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     drift detected                       no drift
            │                                     │
            ▼                                     ▼
     Telegram alert                       Continue normal ops
     → re-recon + update scraper
```

## Manual Test

```powershell
cd D:\Users\user27\coupon-aggregator\backend

# Sample run untuk 1 merchant
python -m recon.ci.drift_notifier --merchant dana

# Untuk semua merchant + notify
.\recon\ci\run_drift_check.ps1 -Notify
```
