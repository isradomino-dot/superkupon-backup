"use client";

import { useEffect } from "react";

import { useStreak } from "@/lib/use-streak";

export function StreakFreezeToast() {
  const { freezeUsed, dismissFreezeUsed } = useStreak();

  useEffect(() => {
    if (!freezeUsed) return;
    // Fire light confetti (cyan/ice theme matching the shield)
    void import("@/lib/confetti").then(({ fireConfetti }) => {
      fireConfetti({
        particleCount: 80,
        colors: ["#7dd3fc", "#38bdf8", "#0ea5e9", "#e0f2fe", "#bae6fd"],
        spread: 85,
      });
    });
    const id = setTimeout(dismissFreezeUsed, 6000);
    return () => clearTimeout(id);
  }, [freezeUsed, dismissFreezeUsed]);

  useEffect(() => {
    if (!freezeUsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissFreezeUsed();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [freezeUsed, dismissFreezeUsed]);

  if (!freezeUsed) return null;

  return (
    <div className="fixed inset-x-0 top-20 z-[120] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        onClick={dismissFreezeUsed}
        className="pointer-events-auto w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl border-2 border-sky-300/40 bg-gradient-to-br from-sky-900 via-cyan-900 to-blue-900 p-4 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
            🛡️ Streak Freeze Aktif
          </span>
          <span className="ml-auto rounded-full bg-cyan-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-200">
            Auto
          </span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 text-3xl shadow-lg ring-2 ring-sky-300/50 ring-offset-2 ring-offset-sky-900">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white">Streak Lo Aman!</h3>
            <p className="line-clamp-2 text-xs text-sky-200">
              1 Streak Freeze otomatis ke-pake — streak{" "}
              <span className="font-bold text-cyan-200">{freezeUsed.savedStreak} hari</span> lo
              berhasil ke-save dari putus.
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2 py-0.5 text-[11px] font-bold text-sky-200">
              <span aria-hidden>❄️</span>
              {freezeUsed.daysCovered} hari ke-cover
            </div>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-sky-300/80">
          Tap untuk tutup · Esc · Beli freeze lagi di /shop
        </p>
      </div>
    </div>
  );
}
