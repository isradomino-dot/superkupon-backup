"use client";

import { useEffect } from "react";

import { useStreak } from "@/lib/use-streak";

const MESSAGES: Record<
  number,
  { title: string; subtitle: string; emoji: string; badge: string }
> = {
  3: {
    title: "3 Hari Beruntun!",
    subtitle: "Awal yang bagus — keep going!",
    emoji: "🎯",
    badge: "Starter",
  },
  7: {
    title: "Seminggu Penuh!",
    subtitle: "Lo udah jadi coupon hunter beneran 💪",
    emoji: "⭐",
    badge: "Weekly Warrior",
  },
  14: {
    title: "2 Minggu Streak!",
    subtitle: "Konsistensi level pro 🌟",
    emoji: "🏅",
    badge: "Fortnight Master",
  },
  30: {
    title: "Sebulan Penuh!",
    subtitle: "Pro coupon hunter — dapet badge 👑",
    emoji: "🏆",
    badge: "Monthly Pro",
  },
  60: {
    title: "2 Bulan Streak!",
    subtitle: "Legendary commitment 💎",
    emoji: "💎",
    badge: "Diamond Hunter",
  },
  100: {
    title: "100 Hari Beruntun!",
    subtitle: "Master coupon hunter — top 0.1% user",
    emoji: "👑",
    badge: "Centurion",
  },
  365: {
    title: "Setahun Penuh!",
    subtitle: "GOAT 🐐 — absolutely legendary",
    emoji: "🌟",
    badge: "Year One Legend",
  },
};

export function StreakMilestoneModal() {
  const { milestone, dismissMilestone, data } = useStreak();

  // Esc to close
  useEffect(() => {
    if (milestone === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissMilestone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [milestone, dismissMilestone]);

  if (milestone === null) return null;

  const msg = MESSAGES[milestone] ?? {
    title: `${milestone} Hari Beruntun!`,
    subtitle: "Amazing achievement!",
    emoji: "🎉",
    badge: "Streak Master",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Close milestone"
        onClick={dismissMilestone}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-center shadow-2xl animate-slide-up">
        {/* Decorative sparkles */}
        <div className="pointer-events-none absolute -left-4 -top-4 text-4xl opacity-40" aria-hidden>✨</div>
        <div className="pointer-events-none absolute -right-4 -bottom-4 text-4xl opacity-40" aria-hidden>✨</div>

        <div className="text-7xl mb-2 animate-bounce">{msg.emoji}</div>

        <div className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
          🎖️ {msg.badge}
        </div>

        <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          {msg.title}
        </h2>
        <p className="mt-2 text-base text-white/95">{msg.subtitle}</p>

        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/20 px-6 py-3 backdrop-blur">
          <span className="text-3xl">🔥</span>
          <div className="text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
              Current streak
            </div>
            <div className="text-2xl font-black text-white">{milestone} hari</div>
          </div>
        </div>

        {data.longestStreak > milestone && (
          <p className="mt-3 text-xs text-white/80">
            🏆 Personal best: {data.longestStreak} hari
          </p>
        )}

        <button
          type="button"
          onClick={dismissMilestone}
          className="mt-6 rounded-full bg-white px-8 py-3 text-base font-bold text-amber-600 shadow-lg hover:bg-amber-50 active:scale-95"
        >
          Terima kasih! 🎊
        </button>

        <p className="mt-4 text-[11px] text-white/70">
          Tap di luar atau tekan Esc untuk tutup
        </p>
      </div>
    </div>
  );
}
