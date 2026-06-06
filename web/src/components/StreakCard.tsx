"use client";

import { useMemo } from "react";

import { useStreak } from "@/lib/use-streak";
import { useHistory } from "@/lib/use-history";

const DAY_LABELS = ["M", "S", "S", "R", "K", "J", "S"]; // Min..Sab (Indonesian)
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StreakCard() {
  const { data, isActiveToday, nextMilestone } = useStreak();
  const { records } = useHistory();

  // Only show widget if user has at least 1 claim ever
  if (data.totalDays < 1 && records.length < 1) return null;

  // Build claim density map: date → count
  const densityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const k = dateKey(new Date(r.claimedAt));
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [records]);

  // Build 35-day grid (5 weeks × 7 days) ending today
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells: { date: Date; count: number; key: string; isToday: boolean }[] = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today.getTime() - i * MS_PER_DAY);
      const k = dateKey(d);
      cells.push({
        date: d,
        count: densityMap.get(k) ?? 0,
        key: k,
        isToday: i === 0,
      });
    }
    return cells;
  }, [densityMap]);

  // Progress to next milestone
  const progress = useMemo(() => {
    if (!nextMilestone) return null;
    const prevMilestone = data.milestonesReached.length > 0
      ? Math.max(...data.milestonesReached)
      : 0;
    const range = nextMilestone - prevMilestone;
    const done = data.currentStreak - prevMilestone;
    return {
      pct: Math.max(0, Math.min(100, (done / range) * 100)),
      remaining: nextMilestone - data.currentStreak,
      target: nextMilestone,
    };
  }, [data.currentStreak, data.milestonesReached, nextMilestone]);

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/5 p-5 shadow-lg animate-slide-up">
      {/* Header: big streak number + status */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={isActiveToday ? "text-5xl animate-pulse" : "text-5xl opacity-60"} aria-hidden>
              🔥
            </span>
            <div className="text-6xl font-black leading-none text-white">
              {data.currentStreak}
            </div>
            <div className="text-sm text-gray-300">hari beruntun</div>
          </div>
          {isActiveToday ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              ✓ Aktif hari ini
            </p>
          ) : data.currentStreak > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
              ⚠️ Salin 1 kupon biar streak gak putus
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-400">Mulai salin kupon untuk mulai streak</p>
          )}
        </div>

        <div className="flex gap-3 text-center">
          <Stat label="Terpanjang" value={data.longestStreak} emoji="🏆" />
          <Stat label="Total aktif" value={data.totalDays} emoji="📅" />
        </div>
      </div>

      {/* Progress to next milestone */}
      {progress && data.currentStreak > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-gray-300">
              <span className="font-semibold text-amber-300">{data.currentStreak}</span> →{" "}
              <span className="text-amber-300">
                🎯 {progress.target}
              </span>{" "}
              hari
            </span>
            <span className="font-semibold text-gray-400">
              {progress.remaining} hari lagi
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-700"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* 35-day calendar heatmap */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold uppercase tracking-wider">5 minggu terakhir</span>
          <LegendRow />
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((d, i) => (
            <div key={`label-${i}`} className="text-center text-[10px] font-medium text-gray-500">
              {d}
            </div>
          ))}
          {grid.map((cell) => (
            <Cell key={cell.key} cell={cell} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
        <span aria-hidden>{emoji}</span> {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function Cell({
  cell,
}: {
  cell: { date: Date; count: number; key: string; isToday: boolean };
}) {
  const intensity =
    cell.count === 0 ? 0 : cell.count <= 1 ? 1 : cell.count <= 3 ? 2 : 3;

  const bgClasses = [
    "bg-white/5",                            // 0 - empty
    "bg-amber-500/30",                        // 1 - 1 claim
    "bg-amber-500/60",                        // 2 - 2-3 claims
    "bg-amber-500",                           // 3 - 4+ claims
  ];

  const dateLabel = cell.date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      title={`${dateLabel} · ${cell.count} klaim${cell.isToday ? " · Hari ini" : ""}`}
      className={[
        "aspect-square rounded-md transition-all hover:scale-110 cursor-help",
        bgClasses[intensity],
        cell.isToday ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-transparent" : "",
      ].join(" ")}
    >
      <span className="sr-only">
        {dateLabel}: {cell.count} klaim
      </span>
    </div>
  );
}

function LegendRow() {
  return (
    <div className="flex items-center gap-1">
      <span>Sedikit</span>
      <span className="h-2.5 w-2.5 rounded-sm bg-white/5" />
      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/30" />
      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" />
      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
      <span>Banyak</span>
    </div>
  );
}
