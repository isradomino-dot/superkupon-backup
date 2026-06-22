# 📧🔔 Notification Stack — Setup Guide

SuperKupon punya 2 notification system baru:
1. **Email Digest Mingguan** — Senin 08:00 WIB auto-kirim KPI + top kupon
2. **PWA Push Notification** — User dapet notif HP saat kupon baru masuk

Setup ~30 menit total (lo + Kang Dedi).

---

## A. EMAIL DIGEST SETUP

Email digest pakai **Resend.com** karena:
- Free tier 3.000 email/bulan (cukup banget buat weekly digest)
- Setup gampang (no SMTP ribet)
- Dashboard analytics built-in (open rate, click rate)
- API key based (gak perlu app password)

### Step 1: Signup Resend.com (5 menit)

1. Buka https://resend.com
2. Klik **"Sign Up"** → pakai email lo (lim279614@gmail.com)
3. Verify email (cek inbox, klik link verification)
4. Login → masuk Dashboard
5. Sidebar kiri → **API Keys** → klik **"Create API Key"**
6. Kasih nama: `superkupon-production`
7. Permission: pilih **"Sending access"** (full access gak perlu)
8. Klik **Create** → muncul key format: `re_xxxxxxxxxxxxxxxxxxxx`
9. **COPY SEKARANG** — key cuma muncul sekali, kalau ilang harus generate ulang
10. Simpen di password manager / notes aman

**Optional (recommended):** Verify custom domain biar kirim dari `noreply@superkupon.id`
- Dashboard → Domains → Add Domain → `superkupon.id`
- Tambahin DNS records (TXT + MX) di Cloudflare
- Tunggu propagasi 5-30 menit
- Kalau gak verify domain, default kirim dari `onboarding@resend.dev` (gak professional tapi works)

### Step 2: Set Railway Env Vars (3 menit)

Sama kayak setup `INVOLVE_ASIA_API_KEY` kemarin:

1. Buka https://railway.app/dashboard
2. Pilih project **superkupon-backend**
3. Klik service backend → tab **Variables**
4. Klik **"+ New Variable"** dan tambahin satu-satu:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
DIGEST_FROM_EMAIL=noreply@superkupon.id
DIGEST_TO_EMAILS=lim279614@gmail.com,kangdedi@example.com
DIGEST_ENABLED=true
```

**Catatan:**
- `DIGEST_FROM_EMAIL` — kalau belum verify domain, pakai `onboarding@resend.dev`
- `DIGEST_TO_EMAILS` — comma-separated, bisa multiple penerima (lo + atasan)
- `DIGEST_ENABLED=true` — toggle on/off tanpa harus delete keys

5. Klik **Save** — Railway auto-redeploy backend (~30 detik)
6. Cek deploy log: pastikan `RESEND_API_KEY loaded` muncul (atau gak ada error)

### Step 3: Test Send (2 menit)

Trigger test digest manual via admin endpoint:

```bash
curl -X POST https://superkupon-backend.railway.app/admin/digest/send-test \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "status": "sent",
  "recipients": ["lim279614@gmail.com", "kangdedi@example.com"],
  "message_id": "abc123-xyz",
  "preview_url": "https://resend.com/emails/abc123-xyz"
}
```

Cek inbox dalam ~10 detik. Email subject: `📊 SuperKupon Weekly Digest — KPI & Top Kupon`

**Kalau gagal:**
- `401 invalid api key` → key salah copy / ada spasi → regenerate
- `403 domain not verified` → `DIGEST_FROM_EMAIL` pakai domain belum verify → ganti ke `onboarding@resend.dev`
- `500 internal error` → cek Railway logs, biasanya env var typo

### Step 4: Schedule Auto-Send (sudah preconfigured)

Backend pakai APScheduler dengan cron `0 8 * * 1` (Senin 08:00 WIB).
Gak perlu setup tambahan — selama `DIGEST_ENABLED=true`, otomatis jalan tiap Senin pagi.

Verify scheduler aktif:
```bash
curl https://superkupon-backend.railway.app/admin/scheduler/jobs \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Cari job `weekly_digest` dengan `next_run_time` di Senin depan jam 08:00 Asia/Jakarta.

---

## B. PUSH NOTIFICATION SETUP

Push notification pakai **Web Push Protocol** (VAPID) — native browser API, gak perlu Firebase / OneSignal.

Keuntungan VAPID:
- Free (gak ada quota / billing)
- Works di Chrome, Edge, Firefox, Safari (iOS 16.4+)
- No vendor lock-in
- Privacy-friendly (no third-party tracking)

### Step 1: Generate VAPID Keys (1 menit)

Run di local backend (sekali aja, keys reusable):

```bash
cd D:/Users/user27/coupon-aggregator/backend
python -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('PRIVATE:', v.private_pem().decode())
print('PUBLIC:', v.public_key.public_bytes_raw().hex())
"
```

**Atau via admin endpoint (kalau backend udah deploy):**
```bash
curl -X POST https://superkupon-backend.railway.app/admin/push/generate-vapid \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Response:
```json
{
  "vapid_private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "vapid_public_key": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
  "warning": "SAVE BOTH KEYS NOW. Private key cannot be retrieved later."
}
```

**SIMPEN DUA-DUANYA** di password manager. Private key cuma di-display sekali.

### Step 2: Set Railway Env Vars (3 menit)

Di Railway backend → Variables, tambahin:

```
VAPID_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_CLAIM_EMAIL=mailto:lim279614@gmail.com
PUSH_ENABLED=true
```

**Catatan multi-line private key:**
- Railway support multi-line value, paste full PEM termasuk header/footer
- Kalau ada masalah escaping, encode base64: `cat key.pem | base64 -w0` lalu di backend decode

Klik Save → backend redeploy.

### Step 3: Set Vercel Env Var (2 menit)

Frontend butuh `VAPID_PUBLIC_KEY` (public, aman di-expose):

1. Buka https://vercel.com/dashboard
2. Pilih project **superkupon-web**
3. Settings → **Environment Variables**
4. Add new:
   - Name: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - Value: `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U`
   - Environment: **Production**, **Preview**, **Development** (centang semua)
5. Klik **Save**
6. Trigger redeploy: Deployments tab → latest → **Redeploy** (tanpa cache)

Tunggu ~1 menit sampe deploy done.

### Step 4: Test in Browser (5 menit)

1. Buka https://superkupon.vercel.app di Chrome / Edge (desktop atau Android)
2. Scroll ke bawah hero section — cari tombol **"🔔 Aktifkan Notif Kupon Baru"**
3. Klik tombol → browser popup minta izin notification → klik **Allow**
4. Tombol berubah jadi **"✅ Notif Aktif (klik untuk matiin)"**
5. Trigger test push via admin:

```bash
curl -X POST https://superkupon-backend.railway.app/admin/push/send-test \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "🎁 Test Notif SuperKupon", "body": "Kalau muncul berarti setup sukses!", "url": "https://superkupon.vercel.app"}'
```

6. Notif muncul di tray (desktop) atau status bar (HP) dalam ~3 detik
7. Klik notif → buka tab SuperKupon

**Real test (auto-trigger):**
- Tunggu scraper next run (tiap 60 menit)
- Kalau ada kupon baru masuk, semua subscribers dapet notif auto
- Atau trigger manual scraper: `curl -X POST .../admin/scrapers/run-all`

### Step 5: iOS Safari Setup (optional, advanced)

iOS Safari support push notification baru di **iOS 16.4+** dan **butuh PWA install**:

1. Di Safari iOS, buka https://superkupon.vercel.app
2. Tap tombol Share (kotak panah ke atas)
3. Scroll → **"Add to Home Screen"**
4. Buka SuperKupon dari home screen icon (bukan Safari tab)
5. Baru tombol enable notif muncul + works

Android Chrome / Edge: works langsung tanpa install PWA.

---

## C. TROUBLESHOOTING

### Email Digest

| Problem | Penyebab | Fix |
|---------|----------|-----|
| Email gak masuk | Spam folder | Cek spam, mark "Not spam", whitelist `noreply@superkupon.id` |
| `401 invalid api key` | Key typo / expired | Regenerate di Resend dashboard |
| `403 domain not verified` | Custom domain belum verify | Pakai `onboarding@resend.dev` sementara |
| Schedule gak jalan | Timezone salah | Cek `TZ=Asia/Jakarta` di Railway env |
| Open rate 0% | Resend tracking pixel di-block | Normal kalau penerima pakai email client privacy-strict (ProtonMail dll) |

### Push Notification

| Problem | Penyebab | Fix |
|---------|----------|-----|
| Tombol gak muncul | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` belum set | Cek Vercel env vars, redeploy |
| Browser gak nanya izin | HTTPS required | Production pakai HTTPS otomatis, local pakai `localhost` (bukan IP) |
| Notif gak nyampe | Subscription expired | Auto re-subscribe via service worker, atau user klik enable ulang |
| `410 Gone` di logs | User uninstall PWA / clear data | Normal, backend auto-delete subscription dari DB |
| iOS gak ada tombol | Bukan PWA install | Add to Home Screen dulu, baru works |

### General

- **Logs**: Railway → service → Deployments → klik deploy → View Logs
- **Resend logs**: https://resend.com/emails (semua email sent + status)
- **Push logs**: `curl .../admin/push/stats -H "X-API-Key: ..."` → return active/expired subscriptions

---

## D. METRICS & MONITORING

### Email Digest Metrics

**Via Resend Dashboard** (https://resend.com/emails):
- Sent count
- Delivered rate
- Open rate (target: >25%)
- Click rate (target: >5%)
- Bounce / complaint rate (target: <1%)

**Via Backend:**
```bash
curl https://superkupon-backend.railway.app/admin/digest/history \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Returns last 10 digest sends with timestamp, recipients, status.

### Push Notification Metrics

```bash
curl https://superkupon-backend.railway.app/admin/push/stats \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Response:
```json
{
  "total_subscriptions": 42,
  "active": 38,
  "expired_410": 4,
  "last_broadcast": "2026-06-22T14:30:00+07:00",
  "last_broadcast_delivered": 38,
  "last_broadcast_failed": 0
}
```

**Target awal (Month 1):**
- 20+ push subscriptions
- 80%+ delivery rate
- 30%+ click-through rate (user klik notif → buka site)

### Admin Dashboard Integration

Buka https://superkupon.vercel.app/admin → scroll ke section **"Notifications"**:
- Card 1: Last digest sent (timestamp + recipient count)
- Card 2: Push subscriptions (active vs expired)
- Card 3: Toggle digest/push on-off (tanpa harus edit env vars)

---

## E. CHECKLIST FINAL

Sebelum announce ke atasan / IG, pastikan:

- [ ] Resend account active, API key di Railway
- [ ] Test email digest sukses masuk inbox (bukan spam)
- [ ] VAPID keys generated, saved di password manager
- [ ] Backend env vars: `RESEND_API_KEY`, `VAPID_*`, `*_ENABLED=true`
- [ ] Frontend env var: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] Test push notif sukses muncul di desktop + HP
- [ ] Scheduler `weekly_digest` shows next run = Senin 08:00 WIB
- [ ] Admin dashboard notifications section render correct
- [ ] Resend custom domain verified (optional tapi recommended)

---

## F. ESTIMASI BIAYA

| Service | Free Tier | Paid (kalau scale) |
|---------|-----------|-------------------|
| Resend | 3.000 email/bulan, 100/hari | $20/mo for 50K emails |
| Web Push (VAPID) | Unlimited (no quota) | Free forever |
| Railway scheduler | Included in current plan | - |

**Total cost setup ini: Rp 0** (selama < 3.000 email/bulan, which is ~100 digest sends to 30 recipients).

---

Generated: 2026-06-22
Maintained by: SuperKupon team
Questions: lim279614@gmail.com
