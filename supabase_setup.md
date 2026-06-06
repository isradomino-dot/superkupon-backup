# Supabase Setup — SuperKupon

Step-by-step setup buat enable cloud sync (auth + favorit/follow/votes sync antar device).

## 1. Buat Supabase Project

1. Buka https://supabase.com → Sign in (free tier cukup buat development)
2. Klik **New Project**
3. Isi:
   - **Name**: `superkupon` (atau apa aja)
   - **Database Password**: bikin password kuat, simpan di password manager
   - **Region**: pilih yang terdekat (Singapore untuk Indonesia)
   - **Pricing**: Free
4. Tunggu ~2 menit project di-provision

## 2. Setup Database Schema

1. Di Supabase dashboard, sidebar kiri → **SQL Editor**
2. Klik **+ New query**
3. Copy seluruh isi file `supabase_schema.sql` (di project root)
4. Paste ke SQL editor
5. Klik **Run** (atau `Ctrl+Enter`)
6. Verify success: harus muncul "Success. No rows returned"

Tabel yang dibikin:
- `profiles` — user info (auto via trigger)
- `user_favorites` — kupon favorit
- `user_folders` — folder untuk grouping favorit
- `user_merchant_follows` — merchant follow list
- `user_coupon_votes` — vote works/expired

Semua tabel dengan **Row Level Security** — tiap user cuma bisa baca/tulis data dia sendiri.

## 2.5. Setup Storage Bucket (Required untuk File Attachments)

1. Sidebar kiri → **Storage**
2. Klik **New bucket**
3. Isi:
   - **Name**: `project-files` (exact, sesuai konstanta di code)
   - **Public bucket**: ❌ OFF (private — access via signed URL)
   - **File size limit**: 10 MB (sesuai limit di app)
   - **Allowed MIME types**: kosongkan (allow semua) atau filter spesifik
4. Klik **Save**

RLS policy untuk bucket udah ke-create otomatis dari SQL schema:
- ✅ Authenticated user bisa upload ke folder `{user_id}/...`
- ✅ Authenticated user bisa read/delete file mereka sendiri
- ✅ Anyone bisa read via signed URL (sharing)

Verify policy di Storage → policies tab — harusnya ada 3 policies (Users upload/read/delete own files).

## 3. Ambil Credentials

1. Sidebar kiri → **Project Settings** (icon gear) → **API**
2. Catat 2 nilai:
   - **Project URL** (e.g. `https://xxxxxx.supabase.co`)
   - **anon public** key (panjang, dimulai dengan `eyJ...`)

⚠️ Jangan pakai `service_role` key — itu admin level, bahaya kalau bocor ke frontend.

## 4. Konfigurasi Frontend

Edit `web/.env.local` (kalau belum ada, copy dari `web/.env.local.example`):

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8001
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

## 5. Restart Next.js Dev

`Ctrl+C` di terminal yang lagi run frontend, terus jalanin lagi:

```bash
cd web && npm run dev
```

Atau double-click `start-frontend.bat` di project root.

## 6. Verify

1. Buka http://localhost:3010
2. Header pojok kanan-atas: tombol "👤 Masuk" warna ungu (bukan amber warning lagi)
3. Klik **Masuk** → modal terbuka
4. **Buat Akun** dengan email + password (min 6 char)
5. Cek inbox lo — Supabase kirim email konfirmasi (default ON)
   - Optional: di Supabase dashboard → Authentication → Settings → matiin "Confirm email" buat dev faster
6. Setelah login, header nampilin avatar inisial dari email lo
7. Klik avatar → menu "☁️ Sync ke Cloud" → buka `/sync` page
8. Test:
   - Tambah beberapa favorit/follow di app dulu
   - Klik **Push sekarang** di /sync
   - Cek di Supabase dashboard → Table Editor → `user_favorites` — harusnya ada row baru

## Email Provider (Opsional)

Default Supabase pakai built-in email provider untuk magic link & confirmation. Limit free tier: ~10 email/hour. Untuk production, setup SMTP custom:

- Supabase dashboard → **Project Settings** → **Authentication** → **SMTP Settings**
- Gunakan SendGrid / Resend / Mailgun / dll

## OAuth Providers (Opsional, Future)

Saat ini app cuma support email auth. Buat tambahin Google/Apple/GitHub login:

- Supabase dashboard → **Authentication** → **Providers**
- Enable provider yang dimau, setup OAuth credentials
- Frontend: `supabase.auth.signInWithOAuth({ provider: 'google' })`

Tinggal tambahin button di `SignInModal.tsx`.

## Troubleshooting

**"Supabase belum dikonfigurasi" persistent warning**
- Pastiin `.env.local` di-restart Next.js (env vars cuma load saat process start)
- Cek `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)` di browser console — harusnya muncul URL lo

**"Invalid login credentials"**
- Email belum di-confirm → cek inbox spam folder
- Password salah → coba "Magic Link" mode di SignInModal

**Push gagal: "permission denied for table user_favorites"**
- RLS policy belum kebentuk → re-run `supabase_schema.sql` di SQL Editor

**Email confirmation gak nyampe**
- Free tier rate-limit → tunggu 1 jam atau matiin "Confirm email" di settings (dev mode)
- Spam folder

## Quotas (Free Tier)

- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 5 GB egress / month
- 7-day inactivity timeout (project paused after 7d no activity, restart manual)

Cukup buat dev + small production.

## Cost Scaling (Pro Tier)

$25/month → unlimited project active, 8 GB DB, 100 GB egress, 100k MAU.
