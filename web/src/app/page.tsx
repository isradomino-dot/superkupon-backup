import { Suspense } from "react";
import type { Metadata } from "next";

import HomeClient from "./HomeClient";

/**
 * Homepage strategy (FINAL, post-bug-fix 2026-06-30):
 *
 * Problem: User Edge browser + RDP network sering dapat "This page couldn't
 * load" pas navigate ke /. Root cause: SSR fetch ke Railway backend yang
 * bisa cold-start lambat, plus blocking await yang trigger Vercel function
 * timeout.
 *
 * Solution:
 *   - HAPUS semua SSR fetch dari HomePage component (instant render)
 *   - Stats di-fetch CLIENT-SIDE via HomeClient useEffect (gak block initial
 *     HTML render, gak block Vercel function)
 *   - Metadata pakai static description (gak butuh fetch realtime untuk SEO)
 *   - revalidate=300 (5 menit ISR) — page di-cache di Vercel CDN, INSTANT load
 *     untuk user, fresh tiap 5 menit di background
 *
 * Result:
 *   - Homepage render INSTANT dari CDN (no SSR wait)
 *   - Stats muncul setelah hydration (1-2 detik post page load)
 *   - Zero "couldn't load" error karena no blocking SSR fetch
 *   - SEO tetap OK (description static, crawler dapet content langsung)
 */
export const revalidate = 300;

const SITE_URL = "https://superkupon.vercel.app";

export const metadata: Metadata = {
  title:
    "SuperKupon — Kupon Digital Indonesia Terbaru | Diskon, Voucher & Cashback",
  description:
    "Aggregator kupon digital Indonesia. Diskon, voucher & cashback dari Shopee, Tokopedia, Lazada, Grab, Gojek, Traveloka, DANA, OVO, dan merchant lainnya — update otomatis tiap jam.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    title: "SuperKupon — Kupon Digital Indonesia Terbaru",
    description:
      "Aggregator kupon digital Indonesia. Diskon, voucher & cashback dari Shopee, Tokopedia, Lazada, Grab, Gojek, Traveloka, DANA, OVO, dll.",
    siteName: "SuperKupon",
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperKupon — Kupon Digital Indonesia Terbaru",
    description:
      "Aggregator kupon digital Indonesia. Diskon, voucher & cashback dari banyak merchant.",
  },
};

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-xl bg-white/5"
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Server-rendered SEO hero — present in initial HTML for crawlers.
          Stats badges di-fetch client-side via HomeClient untuk hindari SSR
          blocking. */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          SuperKupon — Kupon Digital Indonesia Terbaru
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
          Aggregator kupon digital Indonesia. Diskon, voucher & cashback dari
          Shopee, Tokopedia, Lazada, Grab, Gojek, Traveloka, DANA, OVO, dan
          merchant lainnya — update otomatis tiap jam.
        </p>
      </section>

      <Suspense fallback={<HeroSkeleton />}>
        <HomeClient />
      </Suspense>
    </>
  );
}
