---
skema: PELAJARAN_LINTASAI/v7
org_id: ORG-56f9bbc3
repo_id: REPO-c9783db3
staff_id: STAFF-ebacad44
periode: 2026-W27
versi_kit: v1.61.0
jumlah_entri: 3
ringkasan_hitung: { GENTING: 1, PENTING: 2, RAPIKAN: 0 }
---

## ENTRI 1
- Kode: RES-NO-RETRY-BREAKER
- Tingkat: GENTING
- Divisi: Frontend / DevOps
- Status-kit: BELUM-DIJAGA
- Stack: nextjs+service-worker
- Gejala-teknis: Service Worker versi lama tetap menguasai browser pengguna setelah deploy versi baru karena tidak ada mekanisme paksa-unregister; SW lama meng-intercept fetch dan menyajikan respons kadaluarsa, menyebabkan halaman dinamis gagal load di tab non-incognito.
- Lokasi: public/sw.js (akar publik kerangka kerja)
- Terverifikasi-AI: ya
- Ada-pengecek-mesin: tidak
- Dampak-teknis: Kalau SW versi N sudah terpasang di banyak browser pengguna dan versi N+1 dideploy tanpa kill-switch eksplisit, sebagian pengguna terjebak di kode lama sampai 24 jam (default browser refetch interval) — terlihat sebagai "halaman tidak load" / bug regresi yang sulit reproduksi karena hanya muncul di browser tertentu yang sudah punya SW lama.
- Usul-penjaga: Tambah aturan kit "SW deploy harus punya pola kill-switch": setiap perubahan strategi SW (cache → passthrough → no-SW) wajib melalui versi transisi yang memanggil `self.registration.unregister()` di handler `activate`, plus header `Cache-Control: no-store` di response `/sw.js` agar browser refetch immediate, plus retention berkas kill-switch minimum 30 hari (eviction window). Robot pengecek: linter custom yang scan `public/sw.js` — kalau ditemukan handler `fetch`, wajib ada pendamping versi transisi di CHANGELOG project.

## ENTRI 2
- Kode: RES-NO-RETRY-BREAKER
- Tingkat: PENTING
- Divisi: Backend / Frontend (SSR)
- Status-kit: BELUM-DIJAGA
- Stack: nextjs+ssr
- Gejala-teknis: Server-side fetch ke backend eksternal di Server Component / Route Handler tidak memakai `AbortSignal.timeout` dan tidak punya cache hint; ketika backend cold-start atau lambat respon, fungsi serverless mencapai batas timeout (default 10 detik tier hobby) dan browser menampilkan error "halaman tidak bisa load" alih-alih fallback graceful.
- Lokasi: src/app/page.tsx (server component default export) + src/lib/****.ts (fungsi fetch publik)
- Terverifikasi-AI: ya
- Ada-pengecek-mesin: tidak
- Dampak-teknis: Setiap navigasi user ke halaman force-dynamic dengan SSR blocking fetch beresiko timeout fungsi serverless → fallback browser ke error page. Probabilitas naik kalau backend pakai paket gratis yang sleep saat idle (cold-start 5-10 detik). User retention turun karena tampak seperti website rusak.
- Usul-penjaga: Tambah aturan kit "fetch SSR wajib defensif": (1) setiap `fetch` di Server Component / Route Handler wajib pasangkan `signal: AbortSignal.timeout(<n_ms>)` dengan n ≤ 4000ms; (2) hindari `cache: 'no-store'` di SSR jika backend tidak SLA — pakai `next: { revalidate: <s> }` minimum 60 detik untuk ISR; (3) hindari `export const dynamic = 'force-dynamic'` di halaman publik kalau bisa diganti dengan ISR. Robot pengecek: ESLint rule custom yang flag `fetch(` di file `*.tsx`/`route.ts` server-side tanpa `signal:` di options.

## ENTRI 3
- Kode: FE-MISSING-UI-STATES
- Tingkat: PENTING
- Divisi: Frontend
- Status-kit: PENJAGA-BOBOL
- Stack: nextjs+app-router
- Gejala-teknis: Aturan kit menyebut "4 state UI (loading/empty/error/success) + error boundary" secara umum, tapi tidak eksplisit menyebut konvensi file kerangka kerja modern yang membutuhkan `loading.tsx` + `error.tsx` + `global-error.tsx` per route segment; project sering hanya punya 1 dari 3, menyebabkan blank screen saat suspending atau saat error lapisan layout root (yang `error.tsx` standar tidak bisa tangkap).
- Lokasi: src/app/loading.tsx + src/app/global-error.tsx (konvensi kerangka kerja)
- Terverifikasi-AI: ya
- Ada-pengecek-mesin: tidak
- Dampak-teknis: Tanpa `loading.tsx` di route segment, transisi navigasi menampilkan blank screen → browser tertentu (browser berbasis Chromium dengan timeout ketat) men-interpretasikan sebagai "page couldn't load". Tanpa `global-error.tsx`, error di Provider hierarchy root tidak ada fallback → browser fallback ke error page bawaan.
- Usul-penjaga: Perketat aturan kit §FE-MISSING-UI-STATES jadi spesifik: "untuk project kerangka kerja modern dengan konvensi file routing, wajib ada (a) `loading.tsx` di akar app/ + setiap route segment dengan async data, (b) `error.tsx` di akar, (c) `global-error.tsx` di akar (catch error di root layout itself)". Robot pengecek: linter cek file existence — kalau ada `src/app/page.tsx` tapi tidak ada `src/app/loading.tsx` + `src/app/global-error.tsx`, warn.
