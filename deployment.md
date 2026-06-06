# SuperKupon — Deployment Info

> Last updated: 2026-06-06 (commit `2ca67e1`)

## 🚀 Live URLs

### Frontend (Vercel)
| URL | Use case |
|---|---|
| **https://superkupon.vercel.app** | **🎯 Production URL — share ini ke atasan** |
| https://superkupon-git-main-isradomino-dots-projects.vercel.app | Branch URL (auto-update tiap push ke `main`) |

**Status:** 🟢 Live (Hobby plan — gratis)
**Vercel Project:** https://vercel.com/isradomino-dots-projects/superkupon
**Region:** sin1 (Singapore)
**Auto-deploy:** ✅ Enabled (push ke `main` → auto rebuild)

### Backend (FastAPI) — belum di-deploy
| Option | Script | Region |
|---|---|---|
| Railway ⭐ | [deploy-backend-railway.bat](deploy-backend-railway.bat) | ap-southeast-1 |
| Render | Manual via [render.yaml](render.yaml) | Singapore |

Setelah backend deploy:
- Update Vercel env var: `NEXT_PUBLIC_API_BASE=https://your-backend-url`
- Vercel rebuild → data muncul di frontend

---

## 📦 GitHub Repository

**Repo:** https://github.com/isradomino-dot/superkupon
**Branch:** `main`
**Visibility:** Private

### Latest commits
- `2ca67e1` — chore(deps): upgrade Next.js to 16.2.7 (security fix)
- `865d839` — fix(web): clean orphan components + fix build errors (-22 files)
- `8f30a03` — fix(web): add missing Props interface in FileUploader
- `da2d131` — init: SuperKupon coupon aggregator MVP

---

## 🛠️ Workflow Deploy

### Update website (frontend)
```powershell
cd D:\Users\user27\coupon-aggregator
# Edit code di web/...
git add .
git commit -m "feat: deskripsi perubahan"
git push
# Vercel auto-rebuild ~2-3 menit
```

### Update backend (kalau udah di-deploy)
```powershell
cd D:\Users\user27\coupon-aggregator
# Edit code di backend/...
git add .
git commit -m "fix: deskripsi perubahan"
git push
# Railway/Render auto-rebuild ~2-3 menit
```

### Manual rollback
1. Buka https://vercel.com/isradomino-dots-projects/superkupon/deployments
2. Klik deployment lama yang masih working → klik **"..."** → **"Promote to Production"**

---

## ⚙️ Build Settings (Vercel)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Root Directory | `web` |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm install` |
| Node Version | 22.x (Vercel default) |
| Next.js Version | 16.2.7 |

## 🔐 Environment Variables (Vercel)

Saat ini belum ada env vars di-set. Yang perlu ditambah setelah backend deploy:

| Key | Value | Where |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://YOUR-backend-url` | Production, Preview, Development |

Set via:
- Dashboard: vercel.com → Project → Settings → Environment Variables
- CLI: `vercel env add NEXT_PUBLIC_API_BASE production`

---

## 📊 Monitoring

- **Deployments:** https://vercel.com/isradomino-dots-projects/superkupon/deployments
- **Build logs:** klik deployment → "Logs" tab
- **Runtime logs:** Project → "Logs" sidebar (real-time function errors)
- **Analytics:** Project → "Analytics" sidebar (Hobby = basic)

---

## 🚨 Troubleshooting

| Problem | Fix |
|---|---|
| Build fail di Vercel tapi local pass | Cek Node version (Vercel 22 vs local 24+), case-sensitive imports |
| Frontend "Failed to fetch" | Backend belum deploy / `NEXT_PUBLIC_API_BASE` salah |
| CORS error | Backend CORS_ORIGIN_REGEX harus include `vercel.app` (sudah di config.py) |
| Security CVE block | Update package: `npm install next@latest` di `web/` |
| Vercel quota habis | Hobby = 100GB/bln bandwidth, monitor via Usage tab |
