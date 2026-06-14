"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCountUp } from "@/lib/use-count-up";
import { MerchantLogo } from "@/components/MerchantLogo";

interface PublicStats {
  total_active: number;
  merchant_count: number;
  category_count: number;
  new_24h: number;
  new_7d: number;
  total_views: number;
  total_redeems: number;
  total_potential_savings: number;
  excellent_quality_count: number;
  top_merchants: { slug: string; name: string; count: number }[];
  last_updated: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stats/public`)
      .then((r) => r.json())
      .then((d: PublicStats) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent p-8 text-center animate-slide-up">
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          📊 SuperKupon by the Numbers
        </h1>
        <p className="mt-3 text-sm text-gray-300">
          Real data dari aggregator kupon Indonesia. Updated otomatis tiap jam.
        </p>
      </header>

      {loading || !stats ? (
        <StatsSkeletonLoader />
      ) : (
        <>
          {/* HERO METRICS — 4 big number cards */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BigMetric
              icon="🎫"
              label="Kupon Aktif"
              value={stats.total_active}
              accent="emerald"
            />
            <BigMetric
              icon="🏢"
              label="Merchant Partner"
              value={stats.merchant_count}
              accent="sky"
            />
            <BigMetric
              icon="📂"
              label="Kategori"
              value={stats.category_count}
              accent="violet"
            />
            <BigMetric
              icon="✨"
              label="Kupon Quality ★80+"
              value={stats.excellent_quality_count}
              accent="amber"
            />
          </section>

          {/* TOTAL SAVINGS HERO */}
          <section className="overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              💰 Total Potensi Hematan
            </p>
            <CurrencyCountUp value={stats.total_potential_savings} />
            <p className="mt-2 text-xs text-gray-400">
              Akumulasi diskon maksimum dari semua kupon aktif
            </p>
          </section>

          {/* GROWTH + ENGAGEMENT */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricRow
              icon="🔥"
              label="Kupon Baru 24 Jam"
              value={stats.new_24h}
              suffix="kupon"
              color="text-rose-300"
            />
            <MetricRow
              icon="📈"
              label="Kupon Baru 7 Hari"
              value={stats.new_7d}
              suffix="kupon"
              color="text-amber-300"
            />
            <MetricRow
              icon="👁"
              label="Total Views"
              value={stats.total_views}
              suffix="lihat"
              color="text-sky-300"
            />
            <MetricRow
              icon="💾"
              label="Kupon Diklaim"
              value={stats.total_redeems}
              suffix="klaim"
              color="text-emerald-300"
            />
          </section>

          {/* TOP MERCHANTS */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">
              🏆 Top Merchant by Kupon
            </h2>
            <div className="space-y-2">
              {stats.top_merchants.map((m, i) => {
                const max = stats.top_merchants[0]?.count || 1;
                const pct = (m.count / max) * 100;
                return (
                  <Link
                    key={m.slug}
                    href={`/merchant/${m.slug}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/5"
                  >
                    <span className="w-6 text-center text-sm font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <MerchantLogo
                      merchant={{ slug: m.slug, name: m.name }}
                      size={32}
                      rounded="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {m.name}
                        </span>
                        <span className="font-mono text-sm text-brand-300">
                          {m.count} kupon
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SYSTEM */}
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-gray-500">
            <p>
              ⚙ Backend FastAPI + PostgreSQL · Frontend Next.js 16 · Auto-scrape tiap 30 menit
            </p>
            <p className="mt-1">
              Last update: {new Date(stats.last_updated).toLocaleString("id-ID")}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function BigMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  accent: "emerald" | "sky" | "violet" | "amber";
}) {
  const animated = useCountUp(value, 1200);
  const tones = {
    emerald: "border-emerald-400/30 from-emerald-500/15 text-emerald-300",
    sky: "border-sky-400/30 from-sky-500/15 text-sky-300",
    violet: "border-violet-400/30 from-violet-500/15 text-violet-300",
    amber: "border-amber-400/30 from-amber-500/15 text-amber-300",
  };
  return (
    <div
      className={[
        "rounded-2xl border bg-gradient-to-br to-transparent p-5 text-center",
        tones[accent],
      ].join(" ")}
    >
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <div className="mt-2 font-mono text-3xl font-black text-white tabular-nums">
        {animated.toLocaleString("id-ID")}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  suffix: string;
  color: string;
}) {
  const animated = useCountUp(value, 1000);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className={["mt-0.5 font-mono text-xl font-bold tabular-nums", color].join(" ")}>
          {animated.toLocaleString("id-ID")}{" "}
          <span className="text-[10px] font-normal text-gray-500">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

function CurrencyCountUp({ value }: { value: number }) {
  const animated = useCountUp(value, 1500);
  return (
    <p className="mt-4 font-mono text-4xl font-black tabular-nums text-emerald-200 sm:text-6xl">
      Rp {animated.toLocaleString("id-ID")}
    </p>
  );
}

function StatsSkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-32 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
