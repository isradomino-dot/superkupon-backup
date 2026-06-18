"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";
import { couponHref } from "@/lib/coupon-slug";

export const dynamic = "force-dynamic";

interface CategoryPick {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  coupon: Coupon | null;
}

const CATEGORIES: Omit<CategoryPick, "coupon">[] = [
  {
    slug: "food",
    name: "Makan",
    emoji: "🍔",
    color: "from-amber-500/25 to-orange-500/10 border-amber-400/40",
    tagline: "Lapar? Pakai kupon ini",
  },
  {
    slug: "ecommerce",
    name: "Belanja Online",
    emoji: "🛍️",
    color: "from-pink-500/25 to-rose-500/10 border-pink-400/40",
    tagline: "Shopee, Tokopedia, dll",
  },
  {
    slug: "transport",
    name: "Transport",
    emoji: "🚗",
    color: "from-sky-500/25 to-blue-500/10 border-sky-400/40",
    tagline: "Ojek, taksi online",
  },
  {
    slug: "entertainment",
    name: "Hiburan",
    emoji: "🎬",
    color: "from-violet-500/25 to-purple-500/10 border-violet-400/40",
    tagline: "Film, streaming",
  },
  {
    slug: "bills",
    name: "Bayar Tagihan",
    emoji: "💳",
    color: "from-emerald-500/25 to-teal-500/10 border-emerald-400/40",
    tagline: "Pulsa, listrik, dll",
  },
];

function daysLeft(expires: string | null | undefined): number | null {
  if (!expires) return null;
  const d = new Date(expires);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PilihanPage() {
  const { t } = useI18n();
  const [picks, setPicks] = useState<CategoryPick[]>(
    CATEGORIES.map((c) => ({ ...c, coupon: null })),
  );
  const [expiring, setExpiring] = useState<Coupon | null>(null);
  const [topQuality, setTopQuality] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    Promise.all([
      // For each category, fetch top quality coupon
      ...CATEGORIES.map((cat) =>
        listCoupons(
          { category: cat.slug, limit: 1, sort: "quality" },
          { signal: ctrl.signal },
        ).catch(() => [] as Coupon[]),
      ),
      // Expiring soon (sort=expiring, exclude very long expiry)
      listCoupons(
        { sort: "expiring", limit: 5 },
        { signal: ctrl.signal },
      ).catch(() => [] as Coupon[]),
      // Top quality overall — fallback
      listCoupons(
        { sort: "quality", limit: 6 },
        { signal: ctrl.signal },
      ).catch(() => [] as Coupon[]),
    ])
      .then((results) => {
        if (ctrl.signal.aborted) return;
        const categoryResults = results.slice(0, CATEGORIES.length) as Coupon[][];
        const expiringList = results[CATEGORIES.length] as Coupon[];
        const topQ = results[CATEGORIES.length + 1] as Coupon[];

        // Build category picks
        const newPicks: CategoryPick[] = CATEGORIES.map((cat, i) => ({
          ...cat,
          coupon: categoryResults[i]?.[0] ?? null,
        }));
        setPicks(newPicks);

        // Pick "expiring soon" — earliest expiry within next 7 days (urgency)
        const urgent = expiringList.find((c) => {
          const d = daysLeft(c.expires_at);
          return d !== null && d > 0 && d <= 7;
        });
        setExpiring(urgent ?? null);

        // Top quality (skip ones already shown)
        const shownIds = new Set(newPicks.map((p) => p.coupon?.id).filter(Boolean));
        if (urgent) shownIds.add(urgent.id);
        setTopQuality(topQ.filter((c) => !shownIds.has(c.id)).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">💡</span>
          Pilihan Hari Ini
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Bingung mau pakai kupon apa? Ini{" "}
          <span className="font-semibold text-brand-300">5 kupon terbaik</span> hari ini —
          satu per kategori. Tinggal pilih sesuai kebutuhanmu.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
          🔄 Update tiap jam saat ada kupon baru
        </div>
      </header>

      {/* URGENT: Hampir expire — sense of urgency */}
      {expiring && (
        <section className="overflow-hidden rounded-2xl border-2 border-rose-400/50 bg-gradient-to-br from-rose-500/20 via-orange-500/10 to-transparent p-5 shadow-2xl shadow-rose-500/15 animate-slide-up">
          <div className="mb-3 flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-rose-300">
              🔥 Last Chance — Hampir Expire!
            </span>
          </div>
          <Link
            href={couponHref(expiring)}
            className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-rose-400/50 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <MerchantLogo merchant={expiring.merchant} size={48} rounded="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-200">
                  {expiring.merchant.name}
                </p>
                <h2 className="mt-0.5 line-clamp-2 text-base font-bold text-white sm:text-lg">
                  {expiring.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {expiring.code && (
                    <code className="rounded-md bg-amber-500/20 px-2 py-1 font-mono text-xs font-bold text-amber-200">
                      {expiring.code}
                    </code>
                  )}
                  <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-200">
                    ⏰ Tinggal {daysLeft(expiring.expires_at)} hari
                  </span>
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="rounded-lg bg-rose-500/20 px-3 py-1.5">
                  <div className="text-[10px] text-rose-300">Diskon</div>
                  <div className="font-mono text-base font-bold text-white">
                    {formatDiscount(expiring, t)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* 5 KATEGORI CARDS */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
          📂 Mau Hemat Buat Apa Hari Ini?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </>
          ) : (
            picks.map((pick) => <CategoryCard key={pick.slug} pick={pick} t={t} />)
          )}
        </div>
      </section>

      {/* TOP QUALITY — kalo ada kategori kosong */}
      {!loading && topQuality.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
            ⭐ Bonus — Kupon Kualitas Tertinggi
          </h2>
          <div className="space-y-2">
            {topQuality.map((c, i) => (
              <Link
                key={c.id}
                href={couponHref(c)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-brand-400/50 hover:bg-white/10"
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-amber-500/30 text-xs font-bold text-amber-200">
                  {i + 1}
                </span>
                <MerchantLogo merchant={c.merchant} size={36} rounded="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase text-brand-300">
                    {c.merchant.name}
                  </p>
                  <p className="line-clamp-1 text-sm font-bold text-white">{c.title}</p>
                </div>
                <span className="flex-none rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
                  ★ {c.quality_score}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tips footer */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">💡 Cara pakai</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Klik card → buka detail kupon → klik tombol "Salin Kode"</li>
          <li>Buka aplikasi merchant (Shopee, Gojek, dll) → paste kode di checkout</li>
          <li>Kupon "Last Chance" prioritaskan dipakai dulu (mau expire)</li>
          <li>Halaman ini auto-refresh tiap jam saat scraper update</li>
        </ul>
      </div>
    </div>
  );
}

function CategoryCard({
  pick,
  t,
}: {
  pick: CategoryPick;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (!pick.coupon) {
    return (
      <div
        className={[
          "rounded-2xl border bg-gradient-to-br p-5 opacity-50",
          pick.color,
        ].join(" ")}
      >
        <div className="text-3xl">{pick.emoji}</div>
        <h3 className="mt-2 text-base font-bold text-white">{pick.name}</h3>
        <p className="mt-1 text-xs text-gray-400">{pick.tagline}</p>
        <div className="mt-4 text-center text-xs text-gray-500">
          Belum ada kupon hari ini
        </div>
      </div>
    );
  }

  const c = pick.coupon;
  const dleft = daysLeft(c.expires_at);

  return (
    <Link
      href={couponHref(c)}
      className={[
        "group block overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] hover:shadow-xl",
        pick.color,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-3xl transition-transform group-hover:scale-110">
          {pick.emoji}
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-1 text-right">
          <div className="text-[9px] uppercase tracking-wider text-white/60">Hemat</div>
          <div className="font-mono text-sm font-bold text-white">
            {formatDiscount(c, t)}
          </div>
        </div>
      </div>

      <h3 className="mt-3 text-base font-bold text-white">{pick.name}</h3>
      <p className="mt-0.5 text-[11px] text-white/60">{pick.tagline}</p>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          <MerchantLogo merchant={c.merchant} size={24} rounded="sm" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
            {c.merchant.name}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs font-semibold text-white">{c.title}</p>

        <div className="mt-3 flex items-center justify-between">
          {c.code ? (
            <code className="rounded bg-amber-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-100">
              {c.code}
            </code>
          ) : (
            <span className="text-[10px] text-white/40">Auto-applied</span>
          )}
          {dleft !== null && dleft > 0 && dleft <= 14 && (
            <span className="text-[10px] font-bold text-rose-300">⏰ {dleft}d</span>
          )}
        </div>
      </div>
    </Link>
  );
}
