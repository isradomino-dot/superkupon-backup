"use client";

import Link from "next/link";
import { useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";
import { couponHref } from "@/lib/coupon-slug";

export const dynamic = "force-dynamic";

// =============================================================
// MOOD DEFINITIONS
// =============================================================
interface Mood {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  tagline: string;
  color: string;
  categories: string[];
  discountType: string | null;
  reasonChip: string;
  message: string;
}

const MOODS: Mood[] = [
  {
    id: "sad",
    emoji: "😔",
    label: "Sedih",
    desc: "Butuh comfort",
    tagline: "Lagi galau? Mood booster di sini",
    color: "from-blue-500/30 to-indigo-500/15 border-blue-400/40 hover:border-blue-400",
    categories: ["food"],
    discountType: null,
    reasonChip: "💙 Comfort food",
    message: "Kasih waktu buat dirimu — comfort food enak ini bisa angkat mood.",
  },
  {
    id: "happy",
    emoji: "😎",
    label: "Happy",
    desc: "Lagi celebrating",
    tagline: "Saatnya treat yourself!",
    color: "from-amber-500/30 to-orange-500/15 border-amber-400/40 hover:border-amber-400",
    categories: ["food", "fashion"],
    discountType: "percent",
    reasonChip: "🎉 Celebration mode",
    message: "Momen happy harus di-celebrate — kupon spesial buat treat kamu.",
  },
  {
    id: "lazy",
    emoji: "😴",
    label: "Males",
    desc: "Mau santai aja",
    tagline: "Stay di kasur, biar kupon yang nemenin",
    color: "from-purple-500/30 to-violet-500/15 border-purple-400/40 hover:border-purple-400",
    categories: ["food", "ecommerce"],
    discountType: "free_shipping",
    reasonChip: "🛋️ Antar ke rumah",
    message: "Males keluar? Gratis ongkir ini biar belanja tanpa ribet.",
  },
  {
    id: "energetic",
    emoji: "💪",
    label: "Semangat",
    desc: "Lagi produktif",
    tagline: "Boost energimu dengan kupon aktif",
    color: "from-emerald-500/30 to-teal-500/15 border-emerald-400/40 hover:border-emerald-400",
    categories: ["fashion", "food"],
    discountType: "percent",
    reasonChip: "🏃 Energy boost",
    message: "Energi lagi tinggi? Saatnya invest ke gear & nutrisi.",
  },
  {
    id: "frugal",
    emoji: "💰",
    label: "Hemat Mode",
    desc: "Mau hemat banget",
    tagline: "Mode pelit aktif — max savings",
    color: "from-green-500/30 to-emerald-500/15 border-green-400/40 hover:border-green-400",
    categories: [],
    discountType: "cashback",
    reasonChip: "💸 Max savings",
    message: "Pengin nabung? Kupon cashback ini bikin uangmu balik lagi.",
  },
  {
    id: "treat",
    emoji: "🎁",
    label: "Treat Diri",
    desc: "Spoil yourself",
    tagline: "Kamu deserve nice things!",
    color: "from-pink-500/30 to-rose-500/15 border-pink-400/40 hover:border-pink-400",
    categories: ["fashion", "ecommerce"],
    discountType: "percent",
    reasonChip: "✨ Self-love",
    message: "Kamu udah kerja keras — kupon premium ini buat kamu.",
  },
  {
    id: "social",
    emoji: "🥰",
    label: "Quality Time",
    desc: "Date / family time",
    tagline: "Kupon buat momen berharga",
    color: "from-rose-500/30 to-pink-500/15 border-rose-400/40 hover:border-rose-400",
    categories: ["food", "entertainment"],
    discountType: null,
    reasonChip: "❤️ Together time",
    message: "Quality time gak harus mahal — kupon spesial buat moment-mu.",
  },
  {
    id: "bored",
    emoji: "🥱",
    label: "Bosen",
    desc: "Cari hiburan",
    tagline: "Mood booster: hiburan + snack",
    color: "from-violet-500/30 to-fuchsia-500/15 border-violet-400/40 hover:border-violet-400",
    categories: ["entertainment", "food"],
    discountType: null,
    reasonChip: "🎬 Hiburan time",
    message: "Bosen banget? Nonton film + snack = mood booster terbaik.",
  },
];

// =============================================================
// PAGE
// =============================================================
export default function MoodPickerPage() {
  const { t } = useI18n();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const handleMoodPick = async (
    mood: Mood,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    // Capture rect BEFORE await
    const buttonEl = e.currentTarget as HTMLElement;
    const rect = buttonEl?.getBoundingClientRect();

    setSelectedMood(mood);
    setLoading(true);
    setCoupons([]);

    try {
      // Fetch in parallel — baseline + category specific
      const baselinePromise = listCoupons({ sort: "quality", limit: 10 }).catch(
        () => [] as Coupon[],
      );

      const moodPromises =
        mood.categories.length === 0
          ? [
              listCoupons({
                discount_type: mood.discountType ?? undefined,
                sort: "quality",
                limit: 6,
              }).catch(() => [] as Coupon[]),
            ]
          : mood.categories.map((cat) =>
              listCoupons({
                category: cat,
                discount_type: mood.discountType ?? undefined,
                sort: "quality",
                limit: 4,
              }).catch(() => [] as Coupon[]),
            );

      const [baseline, ...moodResults] = await Promise.all([
        baselinePromise,
        ...moodPromises,
      ]);

      // Merge: mood-specific first, baseline as backfill
      const merged: Coupon[] = [];
      const seen = new Set<number>();
      moodResults.flat().forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });
      baseline.forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });

      setCoupons(merged.slice(0, 6));

      // Fire confetti
      if (rect) {
        try {
          fireConfetti({
            origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            particleCount: 100,
          });
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if (!isAbortError(err)) setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedMood(null);
    setCoupons([]);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-pink-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🎨</span>
          Mood Picker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Belanja gak selalu logika — kadang sesuai mood juga. Pilih{" "}
          <span className="font-semibold text-pink-300">perasaanmu sekarang</span>, kita
          kasih kupon yang fit.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-500/15 px-3 py-1 text-xs text-pink-200">
          💡 Konsep baru — fitur ini gak ada di aggregator manapun
        </div>
      </header>

      {!selectedMood ? (
        <section>
          <h2 className="mb-4 text-base font-bold text-white">
            Gimana perasaanmu sekarang?
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={(e) => handleMoodPick(mood, e)}
                className={[
                  "group flex flex-col items-center gap-1.5 rounded-2xl border bg-gradient-to-br p-5 text-center transition-all hover:scale-105 hover:shadow-xl",
                  mood.color,
                ].join(" ")}
              >
                <span className="text-5xl transition-transform group-hover:rotate-12 group-hover:scale-110">
                  {mood.emoji}
                </span>
                <span className="mt-2 text-sm font-bold text-white">{mood.label}</span>
                <span className="text-[10px] text-gray-300">{mood.desc}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            🎯 Tip: kalau bingung, mood "Hemat Mode" cocok buat semua situasi
          </p>
        </section>
      ) : (
        <MoodResult
          mood={selectedMood}
          coupons={coupons}
          loading={loading}
          onReset={reset}
          t={t}
        />
      )}
    </div>
  );
}

// =============================================================
// MOOD RESULT
// =============================================================
function MoodResult({
  mood,
  coupons,
  loading,
  onReset,
  t,
}: {
  mood: Mood;
  coupons: Coupon[];
  loading: boolean;
  onReset: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-5 animate-slide-up">
      {/* Hero summary */}
      <section
        className={[
          "overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-6 shadow-xl",
          mood.color.replace("hover:border-", "border-"),
        ].join(" ")}
      >
        <div className="flex items-start gap-4">
          <span className="text-6xl">{mood.emoji}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Lagi {mood.label.toLowerCase()}? Gotcha.
            </h2>
            <p className="mt-1 text-sm text-gray-200">{mood.tagline}</p>
            <p className="mt-3 rounded-lg bg-white/10 p-3 text-sm italic text-white/90">
              💭 {mood.message}
            </p>
          </div>
        </div>
      </section>

      {/* Coupons grid */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            {mood.reasonChip} Untukmu:
          </h3>
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-pink-300 hover:underline"
          >
            ← Ganti mood
          </button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
            <p className="text-sm text-gray-400">Belum ada kupon yang cocok mood ini.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((c) => (
              <MoodCouponCard key={c.id} coupon={c} reasonChip={mood.reasonChip} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          🎨 Pick Mood Lain
        </button>
        <Link
          href="/"
          className="rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-pink-600"
        >
          Browse Semua →
        </Link>
      </div>
    </div>
  );
}

function MoodCouponCard({
  coupon,
  reasonChip,
  t,
}: {
  coupon: Coupon;
  reasonChip: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Link
      href={couponHref(coupon)}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:scale-[1.02] hover:border-pink-400/50 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <MerchantLogo merchant={coupon.merchant} size={36} rounded="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
            {coupon.merchant.name}
          </p>
          <h3 className="line-clamp-2 text-sm font-bold text-white">{coupon.title}</h3>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-semibold text-pink-200">
          {reasonChip}
        </span>
        <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-brand-200">
          {formatDiscount(coupon, t)}
        </span>
      </div>

      {coupon.code && (
        <code className="mt-2 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
          {coupon.code}
        </code>
      )}
    </Link>
  );
}
