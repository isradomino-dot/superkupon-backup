"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getMerchantStats, isAbortError, type MerchantStatsResponse } from "@/lib/api";
import { SkeletonBar, SkeletonBox } from "@/components/Skeleton";

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  percent: { label: "Persen %", emoji: "💯" },
  fixed: { label: "Nominal Rp", emoji: "💰" },
  cashback: { label: "Cashback", emoji: "💵" },
  free_shipping: { label: "Gratis Ongkir", emoji: "🚚" },
  bogo: { label: "Buy 1 Get 1", emoji: "🎁" },
  unknown: { label: "Lainnya", emoji: "❓" },
};

export function MerchantStats({ slug }: { slug: string }) {
  const [data, setData] = useState<MerchantStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    getMerchantStats(slug, { signal: ctrl.signal })
      .then((d) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!isAbortError(e)) setData(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [slug]);

  if (loading) {
    return <MerchantStatsSkeleton />;
  }

  if (!data) return null;

  const { summary, by_discount_type, by_category, top_by_discount } = data;
  const maxCount = Math.max(
    ...by_discount_type.map((x) => x.count),
    ...by_category.map((x) => x.count),
    1
  );

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent p-6 animate-slide-up">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span aria-hidden>📊</span> Statistik Kupon {data.merchant.name}
        </h2>
        <span className="text-xs text-gray-400">Real-time data</span>
      </header>

      {/* Key metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Kupon aktif"
          value={summary.total_active.toLocaleString("id-ID")}
          emoji="🎟️"
          color="text-brand-300"
        />
        <MetricCard
          label="Hampir berakhir (7d)"
          value={summary.expiring_soon_7d.toLocaleString("id-ID")}
          emoji="⏰"
          color="text-amber-300"
        />
        <MetricCard
          label="Kualitas excellent"
          value={`${summary.excellent_quality}`}
          sublabel={`${summary.total_active > 0 ? Math.round((summary.excellent_quality / summary.total_active) * 100) : 0}% ★ ≥80`}
          emoji="⭐"
          color="text-emerald-300"
        />
        <MetricCard
          label="Avg quality"
          value={`${summary.avg_quality_score.toFixed(1)}`}
          sublabel="/ 100"
          emoji="📈"
          color="text-sky-300"
        />
      </div>

      {/* Engagement row */}
      {(summary.total_views > 0 || summary.total_redeems > 0 || summary.max_discount_value > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SmallStat
            label="Total dilihat"
            value={summary.total_views.toLocaleString("id-ID")}
            emoji="👁️"
          />
          <SmallStat
            label="Total disalin"
            value={summary.total_redeems.toLocaleString("id-ID")}
            emoji="📋"
          />
          <SmallStat
            label="Diskon maks"
            value={
              summary.max_discount_value >= 1000
                ? `Rp ${summary.max_discount_value.toLocaleString("id-ID")}`
                : `${summary.max_discount_value}%`
            }
            emoji="💥"
          />
        </div>
      )}

      {/* Breakdown bars */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BreakdownPanel
          title="Berdasarkan tipe diskon"
          rows={by_discount_type.map((b) => ({
            label: TYPE_LABELS[b.type]?.label ?? b.type,
            emoji: TYPE_LABELS[b.type]?.emoji ?? "•",
            count: b.count,
          }))}
          max={maxCount}
        />
        <BreakdownPanel
          title="Berdasarkan kategori"
          rows={by_category.map((b) => ({
            label: b.name,
            emoji: "🏷️",
            count: b.count,
            href: `/category/${b.slug}`,
          }))}
          max={maxCount}
        />
      </div>

      {/* Top by discount */}
      {top_by_discount.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            🏆 Top diskon
          </h3>
          <ol className="space-y-1">
            {top_by_discount.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/coupon/${c.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition hover:bg-white/5"
                >
                  <span
                    className={[
                      "flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-amber-400/20 text-amber-300"
                        : i === 1
                          ? "bg-slate-300/15 text-slate-200"
                          : "bg-orange-700/20 text-orange-300",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-gray-100">{c.title}</span>
                  <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-300">
                    {c.discount_type === "percent"
                      ? `${c.discount_value}%`
                      : c.discount_type === "free_shipping"
                        ? "Gratis Ongkir"
                        : c.discount_type === "bogo"
                          ? "B1G1"
                          : `Rp ${c.discount_value.toLocaleString("id-ID")}`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  emoji,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  emoji: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <span aria-hidden>{emoji}</span>
        {label}
      </div>
      <div className={["mt-1 text-2xl font-bold", color].join(" ")}>{value}</div>
      {sublabel && <div className="text-[10px] text-gray-500">{sublabel}</div>}
    </div>
  );
}

function SmallStat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <span className="text-lg" aria-hidden>{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
        <div className="truncate text-sm font-semibold text-gray-100">{value}</div>
      </div>
    </div>
  );
}

export function MerchantStatsSkeleton() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-5 w-56 bg-white/10" />
        <SkeletonBar className="h-3 w-24 bg-white/10" />
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <SkeletonBar className="h-2.5 w-2/3 bg-white/10" />
            <SkeletonBox className="mt-2 h-7 w-1/2 bg-white/10" />
            <SkeletonBar className="mt-1.5 h-2 w-1/3 bg-white/5" />
          </div>
        ))}
      </div>

      {/* 3 small stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
          >
            <SkeletonBox className="h-7 w-7 flex-none bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBar className="h-2 w-1/2 bg-white/10" />
              <SkeletonBar className="h-3 w-3/4 bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* 2 breakdown panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((panel) => (
          <div
            key={panel}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <SkeletonBar className="mb-3 h-2.5 w-1/3 bg-white/10" />
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <SkeletonBox className="h-4 w-4 flex-none bg-white/10" />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <SkeletonBar className="h-2.5 w-1/3 bg-white/10" />
                      <SkeletonBar className="h-2.5 w-8 bg-white/10" />
                    </div>
                    <SkeletonBar className="h-1.5 w-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Top by discount list */}
      <div>
        <SkeletonBar className="mb-2 h-3 w-24 bg-white/10" />
        <ul className="space-y-1">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-md p-2">
              <SkeletonBox className="h-7 w-7 flex-none rounded-full bg-white/10" />
              <SkeletonBar className="h-3 flex-1 bg-white/10" />
              <SkeletonBox className="h-5 w-14 bg-white/10" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BreakdownPanel({
  title,
  rows,
  max,
}: {
  title: string;
  rows: { label: string; emoji: string; count: number; href?: string }[];
  max: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const pct = max > 0 ? (r.count / max) * 100 : 0;
          const inner = (
            <div className="group flex items-center gap-2">
              <span className="w-5 text-center text-sm" aria-hidden>
                {r.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between text-xs text-gray-200">
                  <span className="truncate">{r.label}</span>
                  <span className="ml-2 font-mono text-gray-400">{r.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
          return (
            <li key={r.label}>
              {r.href ? (
                <Link href={r.href} className="block rounded-md p-1 hover:bg-white/5">
                  {inner}
                </Link>
              ) : (
                <div className="rounded-md p-1">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
