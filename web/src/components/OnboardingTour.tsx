"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sk_tour_done_v1";

interface Step {
  title: string;
  description: string;
  emoji: string;
  highlight?: string; // CSS selector hint
}

const STEPS: Step[] = [
  {
    title: "Selamat datang di SuperKupon!",
    description:
      "53+ kupon dari 22 merchant Indonesia. Mau gw kasih tur cepat (4 step, <30 detik) supaya lo paham fiturnya?",
    emoji: "👋",
  },
  {
    title: "1. Cari kupon dengan cepat",
    description:
      "Pakai search bar di hero — autocomplete bakal nyaranin merchant, kategori, dan kode kupon hanya dengan 2 huruf pertama. Klik 🎤 untuk voice search.",
    emoji: "🔍",
  },
  {
    title: "2. Filter chip 1-klik",
    description:
      "7 chip cepat: 👗 Fashion, 🛍️ Shopee, 🟣 OVO, 💥 Diskon >50%, 💵 Cashback, 🏙️ Jakarta, 🇮🇩 Lokal Indonesia. Plus 3 sort preset: Diskon Terbesar / Hampir Berakhir / Paling Populer.",
    emoji: "🎛️",
  },
  {
    title: "3. Header icon",
    description:
      "♥ Favorit · 🎯 Smart Pick · 🎁 Kombo Kupon · 🤖 Tanya SuperKupon · 🇮🇩 Bahasa (3 lang) · 🖥️ Theme.",
    emoji: "🎯",
  },
  {
    title: "4. Smart Decision Tools",
    description:
      "🎯 Smart Pick (2-step: pilih kebutuhan + nominal → top 3 kupon hemat) · 🎁 Kombo Kupon (cari kupon yg bisa di-stack hemat maksimal) · 🤖 Tanya SuperKupon (bot natural language).",
    emoji: "🧠",
  },
  {
    title: "Selesai! 🎉",
    description:
      "Lo siap eksplor. Tour ini bisa dibuka lagi via menu Settings (akan datang). Selamat berburu kupon!",
    emoji: "✨",
  },
];

export function OnboardingTour() {
  const [stepIdx, setStepIdx] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const close = (markDone = true) => {
    setOpen(false);
    if (markDone) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore */
      }
    }
  };

  if (!open) return null;

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 via-[#1e1b2e] to-[#1e1b2e] shadow-2xl animate-slide-up">
        <button
          type="button"
          onClick={() => close()}
          aria-label="Skip tour"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
        >
          ×
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mb-3 text-5xl" aria-hidden>
            {step.emoji}
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold text-white">
            {step.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={[
                "h-1.5 rounded-full transition-all",
                i === stepIdx ? "w-6 bg-brand-500" : i < stepIdx ? "w-1.5 bg-brand-400" : "w-1.5 bg-white/15",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 p-4">
          {isFirst ? (
            <button
              type="button"
              onClick={() => close()}
              className="text-xs font-medium text-gray-400 hover:text-gray-200"
            >
              Skip
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10"
            >
              ← Kembali
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={() => close()}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-700"
            >
              🎉 Mulai!
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {isFirst ? "Ya, tunjukin 👉" : "Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
