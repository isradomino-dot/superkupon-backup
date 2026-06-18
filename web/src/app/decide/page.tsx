"use client";

import Link from "next/link";
import { useState } from "react";

import { listCoupons, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";
import { fireConfetti } from "@/lib/confetti";
import { couponHref } from "@/lib/coupon-slug";

export const dynamic = "force-dynamic";

// ============================================================
// CATEGORIES
// ============================================================
interface PurposeOption {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  categories: string[];
  color: string;
}
const PURPOSES: PurposeOption[] = [
  {
    id: "makan",
    emoji: "🍔",
    label: "Makan",
    desc: "Food & minuman",
    categories: ["food"],
    color: "from-amber-500/30 to-orange-500/15 border-amber-400/40 hover:border-amber-400",
  },
  {
    id: "belanja",
    emoji: "🛍️",
    label: "Belanja",
    desc: "E-commerce",
    categories: ["ecommerce", "fashion"],
    color: "from-pink-500/30 to-rose-500/15 border-pink-400/40 hover:border-pink-400",
  },
  {
    id: "transport",
    emoji: "🚗",
    label: "Transport",
    desc: "Ojek, taksi",
    categories: ["transport"],
    color: "from-sky-500/30 to-blue-500/15 border-sky-400/40 hover:border-sky-400",
  },
  {
    id: "hiburan",
    emoji: "🎬",
    label: "Hiburan",
    desc: "Film, streaming",
    categories: ["entertainment"],
    color: "from-violet-500/30 to-purple-500/15 border-violet-400/40 hover:border-violet-400",
  },
  {
    id: "bayar",
    emoji: "💳",
    label: "Bayar",
    desc: "Tagihan, pulsa",
    categories: ["bills"],
    color: "from-emerald-500/30 to-teal-500/15 border-emerald-400/40 hover:border-emerald-400",
  },
  {
    id: "all",
    emoji: "🌐",
    label: "Apa Aja",
    desc: "Tampil semua",
    categories: [],
    color: "from-brand-500/30 to-purple-500/15 border-brand-400/40 hover:border-brand-400",
  },
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const URGENCY_OPTIONS = [
  { id: "anytime", label: "Sewaktu-waktu", emoji: "🌊", days: 365 },
  { id: "today", label: "Hari ini", emoji: "🔥", days: 1 },
  { id: "week", label: "Minggu ini", emoji: "⏰", days: 7 },
  { id: "month", label: "Bulan ini", emoji: "📅", days: 30 },
];

const DISCOUNT_OPTIONS = [
  { id: "any", label: "Apa aja", emoji: "✨", apiVal: null },
  { id: "percent", label: "Diskon %", emoji: "📉", apiVal: "percent" },
  { id: "fixed", label: "Diskon Rp", emoji: "💵", apiVal: "fixed" },
  { id: "cashback", label: "Cashback", emoji: "💰", apiVal: "cashback" },
  { id: "free_shipping", label: "Gratis Ongkir", emoji: "🚚", apiVal: "free_shipping" },
];

// ============================================================
// CALCULATION LOGIC
// ============================================================
interface SmartResult {
  coupon: Coupon;
  savings: number;
  finalPrice: number;
  savingsPercent: number;
  reasons: string[];
  rank: number;
}

function daysLeft(expires: string | null | undefined): number | null {
  if (!expires) return null;
  const d = new Date(expires);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function calcSaving(c: Coupon, amount: number): number {
  const maxDisc = c.max_discount ?? Infinity;
  const minSpend = c.min_spend ?? 0;
  if (amount < minSpend) return 0;

  switch (c.discount_type) {
    case "percent":
      return Math.min((amount * c.discount_value) / 100, maxDisc);
    case "fixed":
      return Math.min(c.discount_value, maxDisc);
    case "cashback":
      if (c.discount_value <= 100) {
        return Math.min((amount * c.discount_value) / 100, maxDisc);
      }
      return Math.min(c.discount_value, maxDisc);
    case "free_shipping":
      return c.max_discount ?? 25000;
    case "bogo":
      return Math.min(amount * 0.5, maxDisc);
    default:
      return c.discount_value > 100 ? Math.min(c.discount_value, maxDisc) : 0;
  }
}

function buildReasons(
  c: Coupon,
  purposeCategories: string[],
  discountType: string | null,
  urgencyDays: number,
): string[] {
  const reasons: string[] = [];

  // Category match
  if (c.category && purposeCategories.length > 0 && purposeCategories.includes(c.category.slug)) {
    reasons.push(`🎯 Match ${c.category.name}`);
  }

  // Quality
  if (c.quality_score >= 80) {
    reasons.push(`⭐ Quality ${c.quality_score}`);
  }

  // No min spend
  if (!c.min_spend || c.min_spend === 0) {
    reasons.push("✅ Tanpa min belanja");
  }

  // Discount type match
  if (discountType && c.discount_type === discountType) {
    reasons.push("📌 Tipe diskon match");
  }

  // Urgency
  if (c.expires_at) {
    const d = daysLeft(c.expires_at);
    if (d !== null && d > 0) {
      if (urgencyDays <= 7 && d <= 7) {
        reasons.push(`🔥 Tinggal ${d} hari`);
      } else if (urgencyDays <= 30 && d <= 14) {
        reasons.push(`⏰ ${d} hari lagi`);
      }
    }
  }

  // Has code
  if (c.code && reasons.length < 4) {
    reasons.push("🎫 Ada kode");
  }

  return reasons.slice(0, 4);
}

// ============================================================
// PAGE
// ============================================================
export default function SmartPickPage() {
  const [purpose, setPurpose] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(200000);
  const [amountInput, setAmountInput] = useState("200000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urgency, setUrgency] = useState<string>("anytime");
  const [discountType, setDiscountType] = useState<string>("any");
  const [results, setResults] = useState<SmartResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedPurpose = PURPOSES.find((p) => p.id === purpose);
  const selectedUrgency = URGENCY_OPTIONS.find((u) => u.id === urgency)!;
  const selectedDiscount = DISCOUNT_OPTIONS.find((d) => d.id === discountType)!;

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const clean = val.replace(/[^0-9]/g, "");
    const n = Number(clean);
    if (Number.isFinite(n)) setAmount(n);
  };

  const findBest = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!purpose) return;
    const buttonEl = e.currentTarget as HTMLElement;
    const rect = buttonEl?.getBoundingClientRect();

    setLoading(true);
    setResults(null);

    try {
      const purposeData = PURPOSES.find((p) => p.id === purpose)!;
      const cats = purposeData.categories;

      // Fetch baseline + category-filtered in parallel
      const baselinePromise = listCoupons({ sort: "quality", limit: 30 }).catch(
        () => [] as Coupon[],
      );
      const strictPromises =
        cats.length === 0
          ? [
              listCoupons({
                discount_type: selectedDiscount.apiVal ?? undefined,
                sort: "quality",
                limit: 30,
              }).catch(() => [] as Coupon[]),
            ]
          : cats.map((cat) =>
              listCoupons({
                category: cat,
                discount_type: selectedDiscount.apiVal ?? undefined,
                sort: "quality",
                limit: 30,
              }).catch(() => [] as Coupon[]),
            );

      const [baselineCoupons, ...strictResults] = await Promise.all([
        baselinePromise,
        ...strictPromises,
      ]);

      // Merge — strict first (will rank higher), baseline as backfill
      const merged: Coupon[] = [];
      const seen = new Set<number>();
      strictResults.flat().forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });
      baselineCoupons.forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });

      // Calculate savings for each + build reasons
      const candidates: SmartResult[] = merged
        .map((c, idx): SmartResult | null => {
          const savings = calcSaving(c, amount);
          if (savings === 0) return null; // not applicable for this amount
          return {
            coupon: c,
            savings: Math.round(savings),
            finalPrice: Math.max(Math.round(amount - savings), 0),
            savingsPercent: Math.round((savings / amount) * 1000) / 10,
            reasons: buildReasons(
              c,
              purposeData.categories,
              selectedDiscount.apiVal,
              selectedUrgency.days,
            ),
            rank: idx + 1,
          };
        })
        .filter((x): x is SmartResult => x !== null);

      // Sort by savings DESC, then quality DESC
      candidates.sort((a, b) => {
        if (b.savings !== a.savings) return b.savings - a.savings;
        return b.coupon.quality_score - a.coupon.quality_score;
      });

      const top3 = candidates.slice(0, 3).map((r, i) => ({ ...r, rank: i + 1 }));
      setResults(top3);

      // Confetti
      if (rect && top3.length > 0) {
        try {
          fireConfetti({
            origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            particleCount: 120,
          });
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if (!isAbortError(err)) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPurpose(null);
    setResults(null);
    setAmount(200000);
    setAmountInput("200000");
    setUrgency("anytime");
    setDiscountType("any");
    setShowAdvanced(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/25 via-purple-500/15 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🎯</span>
          Smart Pick
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Cariin kupon paling hemat dalam{" "}
          <span className="font-semibold text-brand-300">2 step</span> — pilih kebutuhan +
          input nominal, dapat top 3 dengan kalkulasi rupiah hemat.
        </p>
      </header>

      {/* STEP 1: Purpose */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
            1
          </span>
          <h2 className="text-base font-bold text-white">Mau hemat untuk apa?</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPurpose(p.id)}
              className={[
                "group flex flex-col items-center gap-1 rounded-xl border bg-gradient-to-br p-3 text-center transition-all sm:p-4",
                p.color,
                purpose === p.id
                  ? "scale-105 shadow-lg shadow-brand-500/40 ring-2 ring-brand-400"
                  : "hover:scale-105",
              ].join(" ")}
            >
              <span className="text-2xl transition-transform group-hover:scale-110 sm:text-3xl">
                {p.emoji}
              </span>
              <span className="text-xs font-bold text-white sm:text-sm">{p.label}</span>
              <span className="text-[10px] text-gray-300">{p.desc}</span>
              {purpose === p.id && (
                <span className="mt-1 inline-block rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-black text-white">
                  ✓ Dipilih
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* STEP 2: Amount */}
      <section
        className={[
          "rounded-2xl border bg-white/5 p-5 transition-all",
          purpose ? "border-white/10" : "border-white/5 opacity-50 pointer-events-none",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
            2
          </span>
          <h2 className="text-base font-bold text-white">Berapa nominal belanjamu?</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-emerald-300">Rp</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="200000"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xl font-bold text-white placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Quick:
          </span>
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAmount(a);
                setAmountInput(String(a));
              }}
              className={[
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
                amount === a
                  ? "border-brand-400 bg-brand-500/20 text-brand-200"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-400/50 hover:text-white",
              ].join(" ")}
            >
              Rp {(a / 1000).toLocaleString("id-ID")}rb
            </button>
          ))}
        </div>
      </section>

      {/* Optional: Advanced filters */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-gray-300">
            ⚙️ Filter lebih spesifik (opsional)
          </span>
          <span className="text-xs text-gray-500">{showAdvanced ? "▲ Tutup" : "▼ Buka"}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                ⏰ Kapan mau pakai?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={[
                      "rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
                      urgency === u.id
                        ? "border-brand-400 bg-brand-500/20 text-brand-200"
                        : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-400/40",
                    ].join(" ")}
                  >
                    {u.emoji} {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                📉 Tipe diskon
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DISCOUNT_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiscountType(d.id)}
                    className={[
                      "rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
                      discountType === d.id
                        ? "border-brand-400 bg-brand-500/20 text-brand-200"
                        : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-400/40",
                    ].join(" ")}
                  >
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CTA */}
      <button
        type="button"
        onClick={findBest}
        disabled={!purpose || loading}
        className="w-full rounded-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 px-6 py-5 text-base font-black text-white shadow-2xl shadow-brand-500/30 transition hover:scale-[1.01] hover:shadow-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? "🔍 Mencari kupon terbaik..." : "✨ Cariin Top 3 Pilihan"}
      </button>

      {/* RESULTS */}
      {results !== null && !loading && (
        <section className="space-y-3 animate-slide-up">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
              <div className="text-5xl">🤔</div>
              <h2 className="mt-3 text-lg font-bold text-white">
                Belum ada kupon yang fit untuk nominal ini
              </h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-amber-200">
                Coba naikin nominal belanja, atau ganti kategori. Beberapa kupon punya min belanja
                tertentu.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
              >
                🔄 Mulai Ulang
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-transparent p-5 text-center">
                <div className="text-4xl">🎯</div>
                <h2 className="mt-2 text-xl font-bold text-white">Top 3 Pilihan Untukmu!</h2>
                <p className="mt-1 text-xs text-emerald-200">
                  Sorted by rupiah hemat untuk{" "}
                  <span className="font-bold">{selectedPurpose?.label}</span> dengan budget{" "}
                  <span className="font-bold">Rp {amount.toLocaleString("id-ID")}</span>
                </p>
              </div>

              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard key={r.coupon.id} result={r} />
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={reset}
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
          )}
        </section>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SmartResult }) {
  const { coupon, savings, finalPrice, savingsPercent, reasons, rank } = result;

  const rankColors = {
    1: "from-amber-400 to-orange-500 shadow-amber-500/30",
    2: "from-gray-300 to-gray-500 shadow-gray-500/30",
    3: "from-amber-700 to-amber-900 shadow-amber-700/30",
  };
  const rankColor = rankColors[rank as 1 | 2 | 3];

  return (
    <Link
      href={couponHref(coupon)}
      className="group block overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 transition-all hover:scale-[1.01] hover:border-emerald-400/50 hover:shadow-xl"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        {/* Rank badge */}
        <div className="flex flex-row gap-3 sm:flex-col sm:items-center">
          <div
            className={[
              "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-lg",
              rankColor,
            ].join(" ")}
          >
            #{rank}
          </div>
          <div className="flex-1 sm:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">
              {coupon.merchant.name}
            </p>
            <p className="line-clamp-2 text-sm font-bold text-white">{coupon.title}</p>
          </div>
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-2 sm:flex">
            <MerchantLogo merchant={coupon.merchant} size={24} rounded="md" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
              {coupon.merchant.name}
            </span>
          </div>
          <h3 className="mt-1 hidden text-base font-bold text-white sm:block">
            {coupon.title}
          </h3>

          {coupon.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{coupon.description}</p>
          )}

          {/* Reasoning chips */}
          {reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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

          {/* Code */}
          {coupon.code && (
            <code className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-1 font-mono text-xs font-bold text-amber-200">
              {coupon.code}
            </code>
          )}
        </div>

        {/* Savings hero */}
        <div className="flex-none rounded-2xl border border-emerald-300/30 bg-black/30 p-3 text-center sm:min-w-[140px]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">
            💰 Hemat
          </div>
          <div className="mt-1 font-mono text-xl font-black text-emerald-200 sm:text-2xl">
            Rp {savings.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-gray-400">({savingsPercent}%)</div>
          <div className="mt-2 border-t border-emerald-300/20 pt-1">
            <div className="text-[9px] uppercase text-gray-400">Bayar</div>
            <div className="font-mono text-sm font-bold text-white">
              Rp {finalPrice.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
