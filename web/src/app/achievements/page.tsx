"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  TIER_META,
  useAchievements,
  type AchievementCategory,
  type AchievementEntry,
} from "@/lib/use-achievements";

type FilterKey = "all" | "unlocked" | "locked" | AchievementCategory;

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: "all", label: "Semua", emoji: "🏅" },
  { key: "unlocked", label: "Unlocked", emoji: "✓" },
  { key: "locked", label: "Locked", emoji: "🔒" },
  { key: "collection", label: "Collection", emoji: "📋" },
  { key: "streak", label: "Streak", emoji: "🔥" },
  { key: "diversity", label: "Diversity", emoji: "🗺️" },
  { key: "economy", label: "Economy", emoji: "🎁" },
  { key: "shop", label: "Shop", emoji: "🛒" },
  { key: "special", label: "Special", emoji: "✨" },
];

export default function AchievementsPage() {
  const { entries, unlockedCount, total, state } = useAchievements();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "unlocked") return entries.filter((e) => e.isUnlocked);
    if (filter === "locked") return entries.filter((e) => !e.isUnlocked);
    return entries.filter((e) => e.def.category === filter);
  }, [entries, filter]);

  const completionPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-900 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              🏅 Achievements
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Hall of Fame</h1>
            <p className="mt-1 text-sm text-violet-200">
              Long-term goals untuk pro hunter. Unlock semua untuk legenda status.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
          >
            ← Kembali
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Unlocked" value={`${unlockedCount}/${total}`} icon="🏅" highlight />
          <Stat label="Completion" value={`${completionPct}%`} icon="📊" />
          <Stat label="Coins dari Achievement" value={state.totalRewardCoins.toString()} icon="🪙" />
          <Stat
            label="Tier Tertinggi"
            value={highestTier(entries) ?? "—"}
            icon="🏆"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-violet-200">
            <span>Overall progress</span>
            <span className="font-bold tabular-nums text-white">{completionPct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              filter === f.key
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
            ].join(" ")}
          >
            <span aria-hidden className="mr-1">
              {f.emoji}
            </span>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Tidak ada achievement di filter ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <AchievementCard key={entry.def.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function highestTier(entries: AchievementEntry[]): string | null {
  const order: Array<keyof typeof TIER_META> = ["master", "diamond", "gold", "silver", "bronze"];
  for (const tier of order) {
    if (entries.some((e) => e.isUnlocked && e.def.tier === tier)) {
      return TIER_META[tier].label;
    }
  }
  return null;
}

function AchievementCard({ entry }: { entry: AchievementEntry }) {
  const { def, progress, isUnlocked } = entry;
  const tier = TIER_META[def.tier];
  const isHidden = def.hidden && !isUnlocked && progress / def.goal < 0.4;
  const pct = Math.min(100, (progress / def.goal) * 100);

  return (
    <article
      className={[
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition",
        isUnlocked
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-lg shadow-amber-500/20 dark:border-amber-400 dark:from-amber-900/30 dark:to-gray-800"
          : "border-gray-200 bg-white opacity-90 hover:opacity-100 dark:border-gray-700 dark:bg-gray-800",
      ].join(" ")}
    >
      <span
        className={[
          "absolute right-3 top-3 rounded-full bg-gradient-to-r px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow",
          tier.cls,
        ].join(" ")}
      >
        {tier.label}
      </span>

      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br text-4xl shadow-md",
            isUnlocked ? tier.cls : "from-gray-300 to-gray-500 grayscale dark:from-gray-700 dark:to-gray-900",
            isUnlocked ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${tier.ringCls}` : "",
          ].join(" ")}
        >
          <span className={isUnlocked ? "" : "opacity-60"}>{isHidden ? "❓" : def.icon}</span>
        </div>
        <div className="min-w-0 pr-12">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {isHidden ? "??? — Hidden" : def.title}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {isHidden ? "Lanjutkan progress untuk reveal achievement ini." : def.description}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {isHidden ? "?/?" : `${progress}/${def.goal}`}
          </span>
          <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
            +{def.reward} 🪙
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={[
              "h-full rounded-full transition-all duration-500",
              isUnlocked
                ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                : "bg-gradient-to-r from-brand-400 to-brand-600",
            ].join(" ")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isUnlocked ? (
        <div className="flex items-center justify-between rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <span>✓ Unlocked</span>
          {entry.unlockedAt && (
            <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
              {new Date(entry.unlockedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-md bg-gray-100 px-2.5 py-1.5 text-center text-[11px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {isHidden ? "Hidden — keep going" : `${def.goal - progress} lagi untuk unlock`}
        </div>
      )}
    </article>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2",
        highlight ? "border-amber-300/50 bg-amber-400/10" : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-200">
        <span aria-hidden>{icon}</span> {label}
      </div>
      <div className="mt-0.5 text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}
