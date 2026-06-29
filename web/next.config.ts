import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    // Headers strategy — fix "stuck on old version" issue post-deploy:
    // - Auth-sensitive routes (/admin, /profile, /reset): STRICT no-store.
    //   Logout effective, session selalu fresh, akun yg di-revoke gak bisa
    //   pakai cached page.
    // - Halaman publik (homepage, /coupon, /merchant, dll): must-revalidate.
    //   Browser boleh cache TAPI harus tanya server dulu setiap load —
    //   dapet versi terbaru pas user lo push commit baru.
    // - Static assets (_next/static/*) tetap immutable via default Next.js
    //   behavior — filename udah punya content-hash, gak akan stale.
    const noStore = [
      { key: "Cache-Control", value: "no-store, must-revalidate" },
      { key: "Vary", value: "Cookie, Authorization" },
    ];
    const noCacheHtml = [
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      { key: "Vary", value: "Cookie, Authorization" },
    ];
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=0" },
        ],
      },
      // BUGFIX KRITIS: /sw.js HARUS selalu fresh. Browser default cache SW
      // sampai 24 jam — bikin user tab biasa stuck di SW lama post-deploy.
      // no-store + must-revalidate + no-cache → browser SELALU fetch /sw.js
      // dari server, byte compare, kalau beda → trigger update SW immediately.
      //
      // DEPRECATION (sk-v6-killswitch, 2026-06-29):
      // /sw.js is now a KILL-SWITCH that self-unregisters on activate. We KEEP
      // this no-store header so existing users (sk-v3/v4/v5) refetch sw.js,
      // see the byte-diff, install the kill-switch, and get cleanly evicted
      // from SW control. Do NOT remove this header or the /sw.js file until
      // the existing-user cleanup window closes (~30 days post-deploy).
      // After that, /sw.js can be replaced with an empty 204 or removed.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Auth-sensitive: gak boleh ke-cache sama sekali
      { source: "/admin/:path*", headers: noStore },
      { source: "/profile/:path*", headers: noStore },
      { source: "/reset/:path*", headers: noStore },
      // Halaman publik: revalidate per request, tapi boleh cache short-term
      { source: "/", headers: noCacheHtml },
      { source: "/coupon/:slug*", headers: noCacheHtml },
      { source: "/merchant/:slug*", headers: noCacheHtml },
      { source: "/category/:slug*", headers: noCacheHtml },
      { source: "/decide", headers: noCacheHtml },
      { source: "/keranjang", headers: noCacheHtml },
      { source: "/kombo", headers: noCacheHtml },
      { source: "/favorit", headers: noCacheHtml },
      { source: "/pilihan", headers: noCacheHtml },
      { source: "/statistik", headers: noCacheHtml },
    ];
  },
  async rewrites() {
    return [
      // DB stores merchant.logo_url as /logos/<slug>.png, but assets on disk are .svg.
      // Rewrite at the edge so legacy .png paths resolve to the actual .svg files.
      {
        source: "/logos/:name.png",
        destination: "/logos/:name.svg",
      },
    ];
  },
};

export default nextConfig;
