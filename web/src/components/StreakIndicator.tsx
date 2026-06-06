"use client";

import { useState, useRef, useEffect } from "react";

import { useStreak } from "@/lib/use-streak";

export function StreakIndicator() {
  const { data, isActiveToday, nextMilestone } = useStreak();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (data.currentStreak < 1 && data.totalDays < 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Streak: ${data.currentStreak} hari beruntun`}
        title={`🔥 ${data.currentStreak} hari beruntun · Longest: ${data.longestStreak} · Total: ${data.totalDays}`}
        className={[
          "relative flex h-9 items-center gap-1 rounded-md px-2 text-sm font-bold transition",
          isActiveToday
            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30"
            : "bg-white/5 text-gray-400 hover:bg-white/10",
        ].join(" ")}
      >
        <span className={isActiveToday ? "animate-pulse" : ""} aria-hidden>
          🔥
        </span>
        <span>{data.currentStreak}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#1e1b2e] shadow-2xl">
          <div className="bg-gradient-to-br from-amber-500/30 via-transparent to-transparent p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <span aria-hidden>🔥</span> Streak Counter
            </div>
            <div className="mt-2 text-4xl font-black text-white">
              {data.currentStreak}
              <span className="text-base font-medium text-gray-400"> hari beruntun</span>
            </div>
            {!isActiveToday && data.currentStreak > 0 && (
              <p className="mt-1 text-xs text-amber-300">
                ⚠️ Salin 1 kupon hari ini biar streak gak putus
              </p>
            )}
            {isActiveToday && (
              <p className="mt-1 text-xs text-emerald-300">
                ✓ Sudah claim hari ini
              </p>
            )}
          </div>

          <div className="space-y-2 p-4">
            <Row label="Streak terpanjang" value={`${data.longestStreak} hari`} emoji="🏆" />
            <Row label="Total hari aktif" value={`${data.totalDays} hari`} emoji="📅" />
            {nextMilestone && (
              <Row
                label="Milestone berikutnya"
                value={`${nextMilestone - data.currentStreak} hari lagi`}
                emoji="🎯"
                hint={`Target ${nextMilestone} hari`}
              />
            )}
            {data.milestonesReached.length > 0 && (
              <div className="border-t border-white/10 pt-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Milestones tercapai
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.milestonesReached.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300"
                    >
                      {emojiForMilestone(m)} {m}d
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  emoji,
  hint,
}: {
  label: string;
  value: string;
  emoji: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base" aria-hidden>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-400">{label}</div>
        <div className="text-sm font-semibold text-gray-100">
          {value}
          {hint && <span className="ml-1 text-[10px] font-normal text-gray-500">({hint})</span>}
        </div>
      </div>
    </div>
  );
}

function emojiForMilestone(m: number): string {
  if (m >= 365) return "🌟";
  if (m >= 100) return "👑";
  if (m >= 60) return "💎";
  if (m >= 30) return "🏆";
  if (m >= 14) return "🏅";
  if (m >= 7) return "⭐";
  return "🎯";
}
