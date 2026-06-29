import { Suspense } from "react";
import type { Metadata } from "next";

import { fetchPublicStats, type PublicStats } from "@/lib/admin-api";
import HomeClient from "./HomeClient";

// BUGFIX "This page couldn't load":
// Sebelumnya `force-dynamic` paksa SSR ke Railway backend SETIAP request,
// no cache. Kalau Railway cold-start (5-10 detik), Vercel function timeout
// → browser tampil "couldn't load" pas navigate /admin → /.
// Sekarang: default Next.js behavior (ISR via fetch revalidate 60s) — fast
// page load, fresh data tiap 1 menit, no blocking SSR.
export const revalidate = 60;

const SITE_URL = "https://superkupon.vercel.app";

// Server-side fetch with graceful fallback — never throws, never blocks render.
// If backend down, returns null and downstream renders without dynamic stats.
async function safeFetchStats(): Promise<PublicStats | null> {
  try {
    return await fetchPublicStats();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const stats = await safeFetchStats();
  const count = stats?.total_active ?? 100;
  const description = `Aggregator kupon digital Indonesia. ${count}+ kupon aktif dari Shopee, Tokopedia, Lazada, Grab, Gojek, Traveloka, DANA, OVO, dll. Update otomatis tiap jam.`;
  const title =
    "SuperKupon — Kupon Digital Indonesia Terbaru | Diskon, Voucher & Cashback";

  return {
    title,
    description,
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: SITE_URL,
      title,
      description,
      siteName: "SuperKupon",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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

export default async function HomePage() {
  const stats = await safeFetchStats();
  const totalActive = stats?.total_active ?? null;
  const merchantCount = stats?.merchant_count ?? null;
  const new24h = stats?.new_24h ?? null;

  return (
    <>
      {/* Server-rendered SEO hero — present in initial HTML for crawlers
          and users on slow connections. Visually subtle; client UI renders
          richer hero on top once hydrated. */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          SuperKupon — Kupon Digital Indonesia Terbaru
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
          Aggregator kupon digital Indonesia. Diskon, voucher & cashback dari
          Shopee, Tokopedia, Lazada, Grab, Gojek, Traveloka, DANA, OVO, dan
          merchant lainnya — update otomatis tiap jam.
        </p>

        {/* Trust signal strip — server-fetched real stats, no skeleton flicker */}
        {(totalActive !== null || merchantCount !== null || new24h !== null) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {totalActive !== null && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
                {totalActive} kupon aktif
              </span>
            )}
            {merchantCount !== null && (
              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 font-semibold text-sky-300">
                {merchantCount} merchant
              </span>
            )}
            {new24h !== null && new24h > 0 && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-300">
                {new24h} kupon baru hari ini
              </span>
            )}
          </div>
        )}
      </section>

      <Suspense fallback={<HeroSkeleton />}>
        <HomeClient />
      </Suspense>
    </>
  );
}
