"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useQuests, type QuestEntry, type QuestDifficulty } from "@/lib/use-quests";
import { useAchievements } from "@/lib/use-achievements";

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}j ${String(m).padStart(2, "0")}m`;
}

const DIFFICULTY_LABEL: Record<QuestDifficulty, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  medium: { label: "Medium", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  hard: { label: "Hard", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export function DailyQuests() {
  const { quests, state, msToReset, claim } = useQuests();
  const { unlockedCount, total: totalAch } = useAchievements();

  const stats = useMemo(() => {
    const done = quests.filter((q) => q.isClaimed).length;
    const totalReward = quests.reduce((s, q) => s + q.def.reward, 0);
    const earnedReward = quests
      .filter((q) => q.isClaimed)
      .reduce((s, q) => s + q.def.reward, 0);
    return { done, total: quests.length, totalReward, earnedReward };
  }, [quests]);

  if (quests.length === 0) return null;

  const allDone = stats.done === stats.total;

  return (
    <section className="rounded-2xl border border-violet-300/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-violet-600/10 p-5 shadow-sm dark:from-violet-700/20 dark:via-purple-700/10 dark:to-violet-900/20">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-white">
            <span aria-hidden>🎯</span> Misi Harian
            {allDone && (
              <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                ✓ Semua selesai!
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            Selesaikan 3 misi tiap hari · {stats.done}/{stats.total} selesai · +
            {stats.earnedReward}/{stats.totalReward} 🪙
          </p>
        </div>
        <div className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          🔄 Reset dalam {formatCountdown(msToReset)}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quests.map((entry) => (
          <QuestCard key={entry.def.id} entry={entry} onClaim={() => claim(entry.def.id)} />
        ))}
      </div>

      <Link
        href="/achievements"
        className="mt-3 flex items-center justify-between rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-400/20 dark:text-amber-300"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🏅</span>
          Achievements
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tabular-nums">
            {unlockedCount}/{totalAch}
          </span>
        </span>
        <span className="text-amber-600 dark:text-amber-300">→</span>
      </Link>
    </section>
  );
}

function QuestCard({
  entry,
  onClaim,
}: {
  entry: QuestEntry;
  onClaim: () => { ok: true; coins: number } | { ok: false; reason: string };
}) {
  const { def, progress, isComplete, isClaimed } = entry;
  const pct = Math.min(100, (progress / def.goal) * 100);
  const diff = DIFFICULTY_LABEL[def.difficulty];

  return (
    <article
      className={[
        "relative flex flex-col gap-2 rounded-xl border p-3 transition",
        isClaimed
          ? "border-emerald-300/50 bg-emerald-500/10 opacity-75"
          : isComplete
            ? "border-amber-400 bg-amber-100/30 shadow-md shadow-amber-500/20 dark:border-amber-300 dark:bg-amber-900/20"
            : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-2xl flex-none" aria-hidden>
            {def.icon}
          </span>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-white">
              {def.title}
            </h3>
            <p className="line-clamp-2 text-[11px] text-gray-600 dark:text-gray-400">
              {def.description}
            </p>
          </div>
        </div>
        <span
          className={[
            "flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            diff.cls,
          ].join(" ")}
        >
          {diff.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {progress}/{def.goal}
          </span>
          <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
            +{def.reward} 🪙
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={[
              "h-full rounded-full transition-all duration-500",
              isClaimed
                ? "bg-emerald-500"
                : isComplete
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-brand-400 to-brand-600",
            ].join(" ")}
            style={{ width: `${isClaimed ? 100 : pct}%` }}
          />
        </div>
      </div>

      {isClaimed ? (
        <div className="rounded-md bg-emerald-500/15 px-2 py-1 text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          ✓ Sudah diklaim
        </div>
      ) : isComplete ? (
        <button
          type="button"
          onClick={onClaim}
          className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-amber-900 shadow transition hover:brightness-110 active:scale-95"
        >
          🎉 Klaim +{def.reward}
        </button>
      ) : (
        <div className="rounded-md bg-gray-100 px-2 py-1 text-center text-[11px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {def.goal - progress} lagi
        </div>
      )}
    </article>
  );
}
