"use client";

import Link from "next/link";
import { useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";

export const dynamic = "force-dynamic";

interface Answers {
  purpose: string | null;
  budget: string | null;
  urgency: string | null;
  discountType: string | null;
}

interface PurposeOption {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  categories: string[];
}
const PURPOSES: PurposeOption[] = [
  { id: "makan", emoji: "🍔", label: "Makan", desc: "Makanan & minuman", categories: ["food"] },
  { id: "belanja", emoji: "🛍️", label: "Belanja Online", desc: "E-commerce, fashion", categories: ["ecommerce", "fashion"] },
  { id: "transport", emoji: "🚗", label: "Transport", desc: "Ojek, taksi online", categories: ["transport"] },
  { id: "hiburan", emoji: "🎬", label: "Hiburan", desc: "Film, streaming, event", categories: ["entertainment"] },
  { id: "bayar", emoji: "💳", label: "Bayar Tagihan", desc: "Pulsa, listrik, top-up", categories: ["bills"] },
  { id: "all", emoji: "🌐", label: "Apa Aja Boleh", desc: "Tampilkan semua kategori", categories: [] },
];

const BUDGETS = [
  { id: "low", label: "< Rp 50rb", desc: "Belanja kecil", max: 50000 },
  { id: "mid", label: "Rp 50-200rb", desc: "Medium", min: 50000, max: 200000 },
  { id: "high", label: "Rp 200-500rb", desc: "Lumayan", min: 200000, max: 500000 },
  { id: "max", label: "> Rp 500rb", desc: "Belanja besar", min: 500000 },
];

const URGENCIES = [
  { id: "today", label: "Hari ini juga", emoji: "🔥", days: 1 },
  { id: "week", label: "Minggu ini", emoji: "⏰", days: 7 },
  { id: "month", label: "Bulan ini", emoji: "📅", days: 30 },
  { id: "anytime", label: "Sewaktu-waktu", emoji: "🌊", days: 365 },
];

const DISCOUNTS = [
  { id: "percent", label: "Diskon %", emoji: "📉", apiVal: "percent" },
  { id: "fixed", label: "Diskon Rp", emoji: "💵", apiVal: "fixed" },
  { id: "cashback", label: "Cashback", emoji: "💰", apiVal: "cashback" },
  { id: "free_shipping", label: "Gratis Ongkir", emoji: "🚚", apiVal: "free_shipping" },
  { id: "any", label: "Apa aja", emoji: "✨", apiVal: null },
];

export default function DecidePage() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    purpose: null,
    budget: null,
    urgency: null,
    discountType: null,
  });
  const [results, setResults] = useState<Coupon[] | null>(null);
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const setAnswer = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps + 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const restart = () => {
    setStep(1);
    setAnswers({ purpose: null, budget: null, urgency: null, discountType: null });
    setResults(null);
  };

  const fetchRecommendation = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    setStep(5);
    try {
      const purpose = PURPOSES.find((p) => p.id === answers.purpose);
      const budget = BUDGETS.find((b) => b.id === answers.budget);
      const urgency = URGENCIES.find((u) => u.id === answers.urgency);
      const discount = DISCOUNTS.find((d) => d.id === answers.discountType);

      const cats = purpose?.categories ?? [];

      // Fetch top coupons matching all criteria
      const fetchOne = (cat?: string) =>
        listCoupons({
          category: cat,
          discount_type: discount?.apiVal ?? undefined,
          sort: "quality",
          limit: 10,
        }).catch(() => []);

      const allResults = cats.length === 0 ? [await fetchOne(undefined)] : await Promise.all(cats.map((c) => fetchOne(c)));

      // Merge + dedupe
      const merged: Coupon[] = [];
      const seen = new Set<number>();
      allResults.flat().forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });

      // Score each: quality + budget fit + urgency fit
      const scored = merged.map((c) => {
        let score = c.quality_score;

        // Budget fit: lower min_spend = better fit for low budget
        const min = c.min_spend ?? 0;
        if (budget) {
          if (budget.max && min < budget.max) score += 15;
          if (budget.min && min >= budget.min) score += 5;
          if (budget.id === "low" && min === 0) score += 20;
        }

        // Urgency fit: closer-to-expire bonus for urgent
        if (urgency && c.expires_at) {
          const daysLeft = (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (urgency.days <= 1 && daysLeft <= 7) score += 10;
          if (urgency.days <= 7 && daysLeft <= 14) score += 5;
        }

        return { coupon: c, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const top3 = scored.slice(0, 3).map((s) => s.coupon);
      setResults(top3);

      // Confetti for fun
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        particleCount: 120,
      });
    } catch (e) {
      if (!isAbortError(e)) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/25 via-purple-500/15 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🧭</span>
          Decision Helper
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Bingung pilih kupon mana? Jawab 4 pertanyaan singkat — kami kasih{" "}
          <span className="font-semibold text-brand-300">top 3 rekomendasi</span> dengan
          alasan kenapa cocok.
        </p>

        {/* Progress bar */}
        {step <= totalSteps && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-200">
                Step {step} / {totalSteps}
              </span>
              <span className="text-gray-400">{Math.round(progress)}% selesai</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Step 1: Purpose */}
      {step === 1 && (
        <StepCard
          stepNum={1}
          question="Lagi mau apa hari ini?"
          subtitle="Pilih kebutuhanmu — kita filter kupon yang relevan"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {PURPOSES.map((p) => (
              <OptionButton
                key={p.id}
                emoji={p.emoji}
                label={p.label}
                desc={p.desc}
                selected={answers.purpose === p.id}
                onClick={() => setAnswer("purpose", p.id)}
              />
            ))}
          </div>
          <NavButtons
            onNext={goNext}
            disableNext={!answers.purpose}
            showPrev={false}
          />
        </StepCard>
      )}

      {/* Step 2: Budget */}
      {step === 2 && (
        <StepCard
          stepNum={2}
          question="Budget belanjamu kira-kira?"
          subtitle="Buat saring kupon yang sesuai minimum belanja"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {BUDGETS.map((b) => (
              <OptionButton
                key={b.id}
                emoji="💰"
                label={b.label}
                desc={b.desc}
                selected={answers.budget === b.id}
                onClick={() => setAnswer("budget", b.id)}
              />
            ))}
          </div>
          <NavButtons
            onNext={goNext}
            onPrev={goPrev}
            disableNext={!answers.budget}
          />
        </StepCard>
      )}

      {/* Step 3: Urgency */}
      {step === 3 && (
        <StepCard
          stepNum={3}
          question="Kapan mau pakai kuponnya?"
          subtitle="Kupon expiring soon dapat priority kalo urgent"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {URGENCIES.map((u) => (
              <OptionButton
                key={u.id}
                emoji={u.emoji}
                label={u.label}
                desc=""
                selected={answers.urgency === u.id}
                onClick={() => setAnswer("urgency", u.id)}
              />
            ))}
          </div>
          <NavButtons
            onNext={goNext}
            onPrev={goPrev}
            disableNext={!answers.urgency}
          />
        </StepCard>
      )}

      {/* Step 4: Discount preference */}
      {step === 4 && (
        <StepCard
          stepNum={4}
          question="Prefer tipe diskon apa?"
          subtitle="Opsional — pilih 'Apa aja' kalau gak peduli"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {DISCOUNTS.map((d) => (
              <OptionButton
                key={d.id}
                emoji={d.emoji}
                label={d.label}
                desc=""
                selected={answers.discountType === d.id}
                onClick={() => setAnswer("discountType", d.id)}
              />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Kembali
            </button>
            <button
              type="button"
              onClick={fetchRecommendation}
              disabled={!answers.discountType}
              className="rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-500/30 transition hover:scale-105 hover:shadow-brand-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✨ Cariin Kupon Terbaik
            </button>
          </div>
        </StepCard>
      )}

      {/* Step 5: Results */}
      {step === 5 && (
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="text-5xl animate-bounce">🔍</div>
              <p className="mt-4 text-lg font-bold text-white">
                Mencari kupon yg paling cocok...
              </p>
              <p className="mt-2 text-sm text-gray-400">Bentar yaa</p>
            </div>
          ) : results && results.length > 0 ? (
            <>
              <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-transparent p-6 text-center">
                <div className="text-5xl">🎯</div>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Ini Top 3 Pilihanmu!
                </h2>
                <p className="mt-2 text-sm text-emerald-200">
                  Berdasarkan jawabanmu, ini kupon yang paling cocok
                </p>
              </div>

              <SummaryBar answers={answers} />

              <div className="space-y-3">
                {results.map((c, i) => (
                  <ResultCard
                    key={c.id}
                    coupon={c}
                    rank={i + 1}
                    answers={answers}
                    discount={formatDiscount(c, t)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  🔄 Mulai Ulang
                </button>
                <Link
                  href="/"
                  className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-600"
                >
                  Browse Semua Kupon →
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
              <div className="text-5xl">🤷</div>
              <h2 className="mt-2 text-xl font-bold text-white">
                Belum ada kupon yang cocok
              </h2>
              <p className="mt-2 max-w-md text-sm text-amber-200">
                Coba ulang dengan kriteria lebih longgar. Misal pilih{" "}
                <span className="font-semibold">"Apa aja"</span> di tipe diskon.
              </p>
              <button
                type="button"
                onClick={restart}
                className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
              >
                🔄 Mulai Ulang
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StepCard({
  stepNum,
  question,
  subtitle,
  children,
}: {
  stepNum: number;
  question: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-slide-up">
      <div className="mb-5">
        <span className="inline-block rounded-full bg-brand-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-200">
          Step {stepNum}
        </span>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{question}</h2>
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  emoji,
  label,
  desc,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all sm:p-4",
        selected
          ? "scale-105 border-brand-400 bg-brand-500/20 shadow-lg shadow-brand-500/30"
          : "border-white/10 bg-white/5 hover:border-brand-400/50 hover:bg-white/10",
      ].join(" ")}
    >
      <span className="text-2xl transition-transform group-hover:scale-110 sm:text-3xl">
        {emoji}
      </span>
      <span className="text-xs font-bold text-white sm:text-sm">{label}</span>
      {desc && <span className="text-[10px] text-gray-400">{desc}</span>}
      {selected && (
        <span className="mt-1 inline-block rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-black text-white">
          ✓ Dipilih
        </span>
      )}
    </button>
  );
}

function NavButtons({
  onNext,
  onPrev,
  disableNext,
  showPrev = true,
}: {
  onNext: () => void;
  onPrev?: () => void;
  disableNext?: boolean;
  showPrev?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {showPrev && onPrev ? (
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          ← Kembali
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-bold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Lanjut →
      </button>
    </div>
  );
}

function SummaryBar({ answers }: { answers: Answers }) {
  const purpose = PURPOSES.find((p) => p.id === answers.purpose);
  const budget = BUDGETS.find((b) => b.id === answers.budget);
  const urgency = URGENCIES.find((u) => u.id === answers.urgency);
  const discount = DISCOUNTS.find((d) => d.id === answers.discountType);

  const chips = [
    purpose && { emoji: purpose.emoji, text: purpose.label },
    budget && { emoji: "💰", text: budget.label },
    urgency && { emoji: urgency.emoji, text: urgency.label },
    discount && { emoji: discount.emoji, text: discount.label },
  ].filter(Boolean) as { emoji: string; text: string }[];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        Filter:
      </span>
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-200"
        >
          <span aria-hidden>{c.emoji}</span>
          {c.text}
        </span>
      ))}
    </div>
  );
}

function ResultCard({
  coupon,
  rank,
  answers,
  discount,
}: {
  coupon: Coupon;
  rank: number;
  answers: Answers;
  discount: string;
}) {
  const purpose = PURPOSES.find((p) => p.id === answers.purpose);
  const budget = BUDGETS.find((b) => b.id === answers.budget);

  // Build reasoning chips
  const reasons: string[] = [];

  if (coupon.quality_score >= 80) {
    reasons.push(`⭐ Kualitas premium (★${coupon.quality_score})`);
  }
  if (coupon.category && purpose && purpose.categories.includes(coupon.category.slug)) {
    reasons.push(`🎯 Match kategori "${coupon.category.name}"`);
  }
  if (budget) {
    const min = coupon.min_spend ?? 0;
    if (budget.id === "low" && min === 0) reasons.push("✅ Tanpa min belanja");
    else if (budget.max && min < budget.max) {
      reasons.push(`✅ Min belanja cocok budget`);
    }
  }
  if (coupon.expires_at) {
    const daysLeft = Math.ceil(
      (new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft <= 3 && daysLeft > 0) {
      reasons.push(`🔥 Tinggal ${daysLeft} hari lagi`);
    }
  }
  if (coupon.code) {
    reasons.push("🎫 Ada kode promo");
  }

  const rankColor = rank === 1 ? "from-amber-400 to-orange-500" : rank === 2 ? "from-gray-300 to-gray-500" : "from-amber-700 to-amber-900";

  return (
    <Link
      href={`/coupon/${coupon.id}`}
      className="group block overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 transition-all hover:scale-[1.01] hover:border-brand-400/50 hover:shadow-xl"
    >
      <div className="flex gap-4 p-5">
        <div className="flex-none">
          <div
            className={[
              "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-lg",
              rankColor,
            ].join(" ")}
          >
            #{rank}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MerchantLogo merchant={coupon.merchant} size={28} rounded="md" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
              {coupon.merchant.name}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-bold text-white sm:text-lg">
            {coupon.title}
          </h3>
          {coupon.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
              {coupon.description}
            </p>
          )}

          {/* Reasoning chips */}
          {reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reasons.map((r, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-none text-right">
          <div className="rounded-xl bg-brand-500/20 px-3 py-2">
            <div className="text-[10px] uppercase text-brand-300">Diskon</div>
            <div className="mt-0.5 font-mono text-sm font-black text-brand-200 sm:text-base">
              {discount}
            </div>
          </div>
          {coupon.code && (
            <code className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-1 font-mono text-[10px] font-bold text-amber-200">
              {coupon.code}
            </code>
          )}
        </div>
      </div>
    </Link>
  );
}
