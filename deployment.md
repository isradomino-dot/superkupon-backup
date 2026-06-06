# Deploy SuperKupon ke Vercel

Step-by-step deploy frontend (Next.js) ke Vercel + backend FastAPI ke hosting separate.

## Prerequisites

- ✅ Supabase project udah running (lihat `supabase_setup.md`)
- ✅ GitHub account
- ✅ Vercel account (free tier OK, daftar pakai GitHub)
- ⚠️ Backend FastAPI butuh hosting separate — opsi: Railway, Render, Fly.io, Hetzner

---

## Part 1: Push ke GitHub

Vercel deploy via GitHub repo. Kalau project belum di GitHub:

```bash
cd D:/Users/user27/coupon-aggregator
git init
git add .
git commit -m "Initial commit"

# Buat repo baru di github.com (private OK), terus:
git remote add origin https://github.com/USERNAME/superkupon.git
git branch -M main
git push -u origin main
```

⚠️ **PENTING**: pastikan `.env.local` ke-gitignore (jangan commit secret keys). Cek `.gitignore` di `web/` udah include `.env*.local`.

---

## Part 2: Deploy Frontend ke Vercel

### Via Dashboard (Easiest)

1. Buka https://vercel.com → Sign in dengan GitHub
2. Klik **Add New** → **Project**
3. Import repo `superkupon`
4. Konfigurasi:
   - **Framework Preset**: Next.js (auto-detect)
   - **Root Directory**: `web` (karena monorepo, frontend ada di subdirectory)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. **Environment Variables** — tambahin 3 variable:
   ```
   NEXT_PUBLIC_API_BASE=https://YOUR-BACKEND-URL.com
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
6. Klik **Deploy** — tunggu 2-3 menit
7. Setelah sukses, akan dapat URL seperti `https://superkupon.vercel.app`

### Via CLI (Faster for re-deploys)

```bash
npm i -g vercel
cd web
vercel login        # one-time
vercel              # interactive, ikuti prompts
vercel --prod       # deploy ke production
```

### Add Custom Domain (Opsional)

1. Vercel dashboard → project → **Settings** → **Domains**
2. Tambahin domain lo (e.g. `superkupon.id`)
3. Set DNS record sesuai instruksi (CNAME / A record)

---

## Part 3: Deploy Backend FastAPI

Backend gak bisa di Vercel — Vercel cocok untuk Next.js serverless. Pilih hosting:

### Opsi A: Railway (Recommended — easiest)

1. Buka https://railway.app → Sign in dengan GitHub
2. **New Project** → **Deploy from GitHub repo** → pilih `superkupon`
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Variables** tab — tambahin env (kalau ada secret):
   - Misalnya `DATABASE_URL` kalau pakai Postgres external
5. Deploy → akan dapat URL `https://xxx.railway.app`

### Opsi B: Render

1. https://render.com → New → **Web Service**
2. Connect repo, root `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Plan: Free (cold-start lag) atau Starter $7/month

### Opsi C: Fly.io (Lebih advanced, cheap)

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
cd backend
fly launch    # interactive setup
fly deploy
```

---

## Part 4: Update Frontend Env

Setelah backend deployed, update env di Vercel:

1. Vercel dashboard → project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_API_BASE` ke URL backend production:
   ```
   NEXT_PUBLIC_API_BASE=https://your-backend.railway.app
   ```
3. **Redeploy** project (Deployments → ⋯ → Redeploy)

---

## Part 5: Update Supabase Allowed URLs

Supabase butuh tau URL frontend buat OAuth callback:

1. Supabase dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://superkupon.vercel.app` (atau custom domain lo)
3. **Redirect URLs** (allowed): tambahin:
   - `https://superkupon.vercel.app/**`
   - `http://localhost:3010/**` (untuk dev lokal)

---

## Part 6: Setup OAuth Providers (Google + GitHub)

### Google OAuth

1. Buka https://console.cloud.google.com
2. Create project baru → **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID** → Web application
4. **Authorized redirect URIs**: copy URL dari Supabase dashboard:
   - Supabase → Authentication → Providers → Google → "Redirect URL" (biasanya `https://xxx.supabase.co/auth/v1/callback`)
5. Copy **Client ID** & **Client Secret**
6. Balik ke Supabase → Authentication → Providers → Google:
   - Enable toggle
   - Paste Client ID + Secret
   - Save

### GitHub OAuth

1. https://github.com/settings/developers → **New OAuth App**
2. Fields:
   - **Homepage URL**: `https://superkupon.vercel.app`
   - **Authorization callback URL**: copy dari Supabase (sama kayak Google)
3. **Register application**
4. Generate Client Secret
5. Supabase → Authentication → Providers → GitHub:
   - Enable + paste Client ID + Secret

---

## Part 6.5: Enable Realtime Subscription

Realtime untuk `projects` table sudah otomatis enabled via `supabase_schema.sql` (`alter publication supabase_realtime add table public.projects`).

Verify di Supabase dashboard:

1. **Database** → **Publications** → **supabase_realtime**
2. Pastikan `public.projects` ada di "Tables in publication"
3. Kalau belum, klik **Source: public** → toggle checkbox `projects` → Save

Cara test realtime jalan:
1. Sign in dengan akun yang sama di **2 browser tab** (atau 1 tab + 1 device)
2. Tab A: buka `/dashboard/projects` → buat project baru
3. Tab B: project bakal **otomatis muncul** dalam <2 detik tanpa refresh
4. Sidebar: indicator "● Live" + counter event muncul
5. Toast notification "✨ Project dibuat: ..." pop-up bottom-right

### Quotas Realtime (Free Tier)

- 2 concurrent connections per user
- 200 concurrent connections per project total
- Cukup untuk dev + small production

Upgrade ke Pro tier ($25/mo) buat 500 concurrent + tambahan throughput.

### Troubleshooting Realtime

**Indicator stuck di "Connecting…"**
- Realtime gak enabled — re-run SQL `alter publication supabase_realtime add table public.projects`
- Atau Database → Publications → enable via UI

**Indicator "Error"**
- Cek browser console — ada WebSocket connection error?
- Cek RLS policy — user gak bisa subscribe kalau policy block

**Event muncul lambat (>5 detik)**
- Free tier ada throttling — upgrade plan kalau butuh sub-second

**Echo: edit di tab sendiri muncul sebagai realtime event**
- Sudah ditangani via `localOpRef` di useProjects — skip echo 2 detik

---

## Part 7: Verify Production

1. Buka URL Vercel (e.g. https://superkupon.vercel.app)
2. Test:
   - Browse kupon (harusnya data dari backend production muncul)
   - Sign in via Google/GitHub button
   - Buka `/dashboard/projects` → buat project test
   - Buka Supabase dashboard → Table Editor → `projects` → cek row baru
3. Cek browser console — gak ada error CORS atau 404

---

## Troubleshooting

**CORS error saat fetch backend dari Vercel domain**
- Backend FastAPI: pastiin `allow_origins` include Vercel domain di `CORSMiddleware`
- File `backend/app/main.py` punya `allow_origin_regex=r"http(s)?://.*"` cukup permissive

**OAuth callback gagal redirect**
- Cek Supabase Site URL & Redirect URLs include domain Vercel
- Cek OAuth provider (Google/GitHub) callback URL match dengan Supabase

**Build failed di Vercel**
- Cek `web/package.json` script `build` valid
- Cek deps: `npm install` di lokal jalan tanpa error
- Cek Node version: Vercel default Node 20

**Backend cold start lambat (Railway/Render free tier)**
- Free tier auto-sleep — first request after idle slow (~5-10s)
- Upgrade ke paid tier atau pakai uptime ping service (Uptimerobot)

---

## Production Checklist

- [ ] `.env.local` NOT in git (cek `.gitignore`)
- [ ] Vercel env vars set (3 variables)
- [ ] Backend deployed + healthy
- [ ] Supabase Site URL configured
- [ ] OAuth providers active (Google + GitHub)
- [ ] Custom domain (opsional)
- [ ] Analytics setup (Vercel Analytics free tier)
- [ ] Error monitoring (Sentry/LogRocket opsional)

---

## Continuous Deployment

Vercel auto-deploy tiap push ke `main`. Untuk preview deployments:
- Push ke branch lain → Vercel auto-create preview URL
- Berguna buat test fitur sebelum merge

Setup branch protection di GitHub → require Vercel checks pass sebelum merge.
