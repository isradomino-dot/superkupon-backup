"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCoupons, listMerchants, listCategories, isAbortError } from "@/lib/api";
import type { Coupon, MerchantWithCount, Category } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

interface CalculatedDeal {
  coupon: Coupon;
  savings: number;
  finalPrice: number;
  savingsPercent: number;
  applicable: boolean;
  reason?: string;
}

function calculateSavings(c: Coupon, total: number): CalculatedDeal {
  const minSpend = c.min_spend ?? 0;
  const maxDisc = c.max_discount ?? Infinity;

  // Check minimum spending requirement
  if (total < minSpend) {
    return {
      coupon: c,
      savings: 0,
      finalPrice: total,
      savingsPercent: 0,
      applicable: false,
      reason: `Min belanja Rp ${minSpend.toLocaleString("id-ID")} — kurang Rp ${(minSpend - total).toLocaleString("id-ID")}`,
    };
  }

  let savings = 0;
  switch (c.discount_type) {
    case "percent": {
      // Discount value is percentage (e.g., 20 = 20%)
      savings = Math.min((total * c.discount_value) / 100, maxDisc);
      break;
    }
    case "fixed": {
      savings = Math.min(c.discount_value, maxDisc);
      break;
    }
    case "cashback": {
      // Cashback: discount_value is percentage if <= 100, otherwise Rp absolute
      if (c.discount_value <= 100) {
        savings = Math.min((total * c.discount_value) / 100, maxDisc);
      } else {
        savings = Math.min(c.discount_value, maxDisc);
      }
      break;
    }
    case "free_shipping": {
      // Assume average shipping = max_discount or Rp 25rb default
      savings = c.max_discount ?? 25000;
      break;
    }
    case "bogo": {
      // Buy 1 Get 1 — assume half off
      savings = Math.min(total * 0.5, maxDisc);
      break;
    }
    default: {
      savings = c.discount_value > 100 ? Math.min(c.discount_value, maxDisc) : 0;
    }
  }

  const finalPrice = Math.max(total - savings, 0);
  const savingsPercent = total > 0 ? (savings / total) * 100 : 0;

  return {
    coupon: c,
    savings: Math.round(savings),
    finalPrice: Math.round(finalPrice),
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    applicable: savings > 0,
  };
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export default function KalkulatorPage() {
  const [amount, setAmount] = useState<number>(200000);
  const [amountInput, setAmountInput] = useState("200000");
  const [merchant, setMerchant] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [merchants, setMerchants] = useState<MerchantWithCount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  // Load merchants + categories once
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      listMerchants({ signal: ctrl.signal }).catch(() => []),
      listCategories({ signal: ctrl.signal }).catch(() => []),
    ]).then(([m, c]) => {
      if (!ctrl.signal.aborted) {
        setMerchants(m.filter((x) => x.coupon_count > 0));
        setCategories(c);
      }
    });
    return () => ctrl.abort();
  }, []);

  // Fetch coupons whenever filter changes
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listCoupons(
      {
        merchant: merchant || undefined,
        category: category || undefined,
        limit: 50,
        sort: "quality",
      },
      { signal: ctrl.signal },
    )
      .then((c) => {
        if (!ctrl.signal.aborted) setCoupons(c);
      })
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [merchant, category]);

  // Calculate deals for current amount
  const deals = useMemo(() => {
    if (amount <= 0) return [];
    const calculated = coupons.map((c) => calculateSavings(c, amount));
    const applicable = calculated
      .filter((d) => d.applicable)
      .sort((a, b) => b.savings - a.savings);
    const notApplicable = calculated
      .filter((d) => !d.applicable)
      .sort((a, b) => (a.coupon.min_spend ?? 0) - (b.coupon.min_spend ?? 0))
      .slice(0, 3);
    return { applicable: applicable.slice(0, 5), notApplicable };
  }, [coupons, amount]);

  const topDeal = Array.isArray(deals) ? null : deals.applicable[0];

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const clean = val.replace(/[^0-9]/g, "");
    const n = Number(clean);
    if (Number.isFinite(n)) setAmount(n);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🧮</span>
          Kalkulator Hemat
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Mau belanja berapa? Kasih tau nominalnya, kita kasih{" "}
          <span className="font-semibold text-emerald-300">kupon paling hemat</span> + rupiah
          actual hematan + harga final.
        </p>
      </header>

      {/* Input form */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        {/* Amount input */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            💸 Nominal Belanja (Rp)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-emerald-300">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="200000"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xl font-bold text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>
          {/* Quick amount chips */}
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
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-emerald-400/50 hover:text-white",
                ].join(" ")}
              >
                Rp {(a / 1000).toLocaleString("id-ID")}rb
              </button>
            ))}
          </div>
        </div>

        {/* Merchant + Category filters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              🏢 Merchant (opsional)
            </label>
            <select
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="">Semua merchant</option>
              {merchants.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} ({m.coupon_count} kupon)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              📂 Kategori (opsional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : !Array.isArray(deals) && deals.applicable.length > 0 ? (
        <>
          {/* TOP DEAL HERO */}
          <section className="overflow-hidden rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-teal-500/10 to-transparent p-6 shadow-2xl shadow-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              🏆 Paling Hemat
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr,auto] sm:items-center">
              <Link
                href={`/coupon/${deals.applicable[0].coupon.id}`}
                className="block hover:underline"
              >
                <div className="flex items-center gap-3">
                  <MerchantLogo
                    merchant={deals.applicable[0].coupon.merchant}
                    size={48}
                    rounded="md"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      {deals.applicable[0].coupon.merchant.name}
                    </p>
                    <h2 className="line-clamp-2 text-lg font-black text-white sm:text-xl">
                      {deals.applicable[0].coupon.title}
                    </h2>
                  </div>
                </div>
                {deals.applicable[0].coupon.code && (
                  <code className="mt-3 inline-block rounded-lg border-2 border-dashed border-emerald-300/60 bg-emerald-500/20 px-3 py-1.5 font-mono text-base font-black tracking-wider text-emerald-100">
                    {deals.applicable[0].coupon.code}
                  </code>
                )}
              </Link>
              <div className="rounded-2xl border border-emerald-300/30 bg-black/30 p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Kamu Hemat
                </div>
                <div className="mt-1 font-mono text-3xl font-black text-emerald-200 sm:text-4xl">
                  -Rp {deals.applicable[0].savings.toLocaleString("id-ID")}
                </div>
                <div className="mt-1 text-[10px] text-gray-400">
                  ({deals.applicable[0].savingsPercent}% diskon)
                </div>
                <div className="mt-3 border-t border-emerald-300/20 pt-2">
                  <div className="text-[10px] uppercase text-gray-400">Final Price</div>
                  <div className="mt-0.5 font-mono text-xl font-bold text-white">
                    Rp {deals.applicable[0].finalPrice.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* OTHER DEALS */}
          {deals.applicable.length > 1 && (
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
                📋 Pilihan Lain ({deals.applicable.length - 1})
              </h3>
              <div className="space-y-2">
                {deals.applicable.slice(1).map((d, i) => (
                  <Link
                    key={d.coupon.id}
                    href={`/coupon/${d.coupon.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-400/50 hover:bg-white/10"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-200">
                      {i + 2}
                    </span>
                    <MerchantLogo merchant={d.coupon.merchant} size={36} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase text-emerald-300">
                        {d.coupon.merchant.name}
                      </p>
                      <p className="line-clamp-1 text-sm font-bold text-white">
                        {d.coupon.title}
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-sm font-bold text-emerald-300">
                        -Rp {d.savings.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Final Rp {d.finalPrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Not applicable suggestions */}
          {deals.notApplicable.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                💡 Kalo Tambah Belanja, Bisa Lebih Hemat
              </h3>
              <div className="space-y-2">
                {deals.notApplicable.map((d) => (
                  <div
                    key={d.coupon.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"
                  >
                    <MerchantLogo merchant={d.coupon.merchant} size={32} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-semibold text-amber-100">
                        {d.coupon.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-300">{d.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <div className="text-5xl">🔍</div>
          <p className="mt-3 text-base font-semibold text-gray-200">
            Belum ada kupon yang cocok
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Coba ganti merchant / kategori, atau naikin nominal belanja.
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-400">
        <h3 className="mb-1 font-bold text-gray-300">ℹ️ Cara baca</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="text-emerald-300">Kamu Hemat</strong> = rupiah yang ke-saved kalo
            pakai kupon ini
          </li>
          <li>
            <strong className="text-emerald-300">Final Price</strong> = total bayar setelah diskon
          </li>
          <li>Kupon di-rank by saving terbesar (bukan diskon %, tapi rupiah actual)</li>
          <li>Min belanja di-validate — kupon yg gak applicable disembunyikan</li>
        </ul>
      </div>
    </div>
  );
}
