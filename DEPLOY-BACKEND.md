# SuperKupon Backend — Deploy Guide

Backend FastAPI butuh public URL biar frontend Vercel bisa hit. Dua opsi free-tier:

| Platform | Free Tier | Sleep? | DB | Deploy Method |
|---|---|---|---|---|
| **Railway** ⭐ recommended | $5 credit/mo (~500 jam) | ❌ Tidak sleep | Postgres add-on (gratis dalam credit) | CLI atau GitHub |
| **Render** | 750 jam/mo web service | ✅ Sleep 15min idle (cold start ~30s) | Postgres free 90 hari | Blueprint via GitHub |

**Pilih Railway** kalau:
- Mau scheduler APScheduler jalan terus (perlu always-on)
- Butuh response cepat tanpa cold start
- OK pakai dashboard untuk env config

**Pilih Render** kalau:
- Mau setup full-automated lewat `render.yaml` blueprint
- OK dengan cold start (situs jarang dipake)
- Mau Postgres gratis 90 hari dulu

---

## Option A — Railway (Recommended)

### Cara Cepat (CLI script)
1. Double-click [`deploy-backend-railway.bat`](deploy-backend-railway.bat) atau jalan `.\deploy-backend-railway.ps1`
2. Browser kebuka → login Railway
3. Saat ditanya: pilih "Create new project", nama: `superkupon-backend`
4. Di Railway dashboard: Project → New → **Add PostgreSQL** (DATABASE_URL otomatis ke-inject)
5. Project → Settings → Networking → **Generate Domain** → copy URL
6. Set di Vercel frontend env: `NEXT_PUBLIC_API_BASE=https://your-url.up.railway.app`
7. Re-deploy frontend: `cd web && vercel --prod`

### Cara Manual (via GitHub)
1. Push code ke GitHub
2. railway.com → New Project → Deploy from GitHub repo
3. Pilih repo, set **Root Directory: `backend`**
4. Railway auto-detect `railway.toml` + Dockerfile
5. Add PostgreSQL service di project yg sama
6. Generate domain → copy URL
7. Set env di Vercel: `NEXT_PUBLIC_API_BASE=...`

### Env vars opsional (set di Railway dashboard)
```
APP_ENV=production
DEBUG=false
SCRAPER_USE_MOCK=true     # V1: pake mock data
ANTHROPIC_API_KEY=sk-...   # kalau pake V3 LLM extraction
TELEGRAM_BOT_TOKEN=...     # kalau aktifin notif Telegram
```

---

## Option B — Render (via Blueprint)

### Step-by-step
1. **Push code ke GitHub** (Render butuh git repo, tidak ada CLI deploy seperti Railway)
   ```powershell
   cd D:\Users\user27\coupon-aggregator
   git init; git add .; git commit -m "init"
   git remote add origin https://github.com/USERNAME/coupon-aggregator.git
   git push -u origin main
   ```

2. **Buka render.com → New → Blueprint**

3. **Connect repo**, Render auto-baca [`render.yaml`](render.yaml) dan setup:
   - Web service `superkupon-backend` (Docker, region Singapore, free plan)
   - Postgres database `superkupon-db` (free 90 hari)
   - DATABASE_URL auto-linked ke web service

4. **Click "Apply"** → tunggu build (~3-5 menit)

5. Setelah deploy: copy URL `https://superkupon-backend.onrender.com`

6. Set di Vercel: `NEXT_PUBLIC_API_BASE=https://superkupon-backend.onrender.com`

7. Re-deploy frontend: `cd web && vercel --prod`

### Catatan Render free tier
- Service sleep setelah 15 menit gak ada request → request pertama setelah sleep cold start ~30 detik
- APScheduler tetap jalan saat awake doang → cron pipeline mungkin miss kalau idle
- Postgres expired 90 hari → upgrade jadi $7/mo atau migrate

---

## Setelah Backend Deployed (kedua opsi)

### 1. Test endpoint
Open browser:
- `https://YOUR-BACKEND-URL/health` → harus `{"status": "ok"}`
- `https://YOUR-BACKEND-URL/api/coupons?limit=5` → harus dapat list kupon

### 2. Update Vercel env var
**Via dashboard:** vercel.com → Project → Settings → Environment Variables
```
Key:   NEXT_PUBLIC_API_BASE
Value: https://YOUR-BACKEND-URL
Env:   Production, Preview, Development
```

**Via CLI:**
```powershell
cd D:\Users\user27\coupon-aggregator\web
vercel env add NEXT_PUBLIC_API_BASE production
# paste URL saat diminta
```

### 3. Re-deploy frontend
```powershell
cd D:\Users\user27\coupon-aggregator\web
vercel --prod
```

### 4. CORS — pastikan backend allow Vercel domain
Sudah disetup di [`backend/app/config.py`](backend/app/config.py) — regex `https://*.vercel.app` di-whitelist by default. Kalau pake custom domain, tambahkan via env:
```
CORS_ORIGINS=["https://your-custom-domain.com"]
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Frontend "Failed to fetch" | Cek `NEXT_PUBLIC_API_BASE` di Vercel env, harus include `https://` |
| CORS error di console | Backend deploy lama? Restart service di Railway/Render dashboard |
| Build gagal di Render | Lihat log — sering karena dependency. Pastikan `requirements.txt` lengkap |
| DB connection error | Postgres add-on terlinked? Cek `DATABASE_URL` env var |
| Scheduler gak jalan di Render | Free tier sleep — upgrade ke Starter $7/mo atau pindah Railway |

---

## Cost Summary

| | Railway | Render |
|---|---|---|
| Web service | $5 credit ~ free | Free (sleep) |
| Postgres | Termasuk credit | Free 90 hari, $7/mo after |
| Upgrade always-on | $5/mo addtl jika habis credit | Starter $7/mo |
| **Total awal** | **Rp 0** | **Rp 0** |
| **After 90 hari** | ~Rp 80k/mo (~$5) | ~Rp 110k/mo (~$7) |

Untuk MVP/demo ke atasan, **Railway** lebih aman (gak sleep, scheduler jalan).
