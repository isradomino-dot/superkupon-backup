"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useDailyLogin } from "@/lib/use-daily-login";
import { SHOP_CATALOG, useInventory, type ShopItem, type ItemCategory } from "@/lib/use-inventory";

const CATEGORIES: { key: "all" | ItemCategory; label: string; emoji: string }[] = [
  { key: "all", label: "Semua", emoji: "🛒" },
  { key: "boost", label: "Boost", emoji: "⚡" },
  { key: "utility", label: "Utility", emoji: "🛠️" },
  { key: "cosmetic", label: "Cosmetic", emoji: "✨" },
];

export default function ShopPage() {
  const { data: dlData, hasActiveBoost } = useDailyLogin();
  const { data: invData, isOwned, consumableCount, purchase } = useInventory();
  const [filter, setFilter] = useState<"all" | ItemCategory>("all");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return SHOP_CATALOG;
    return SHOP_CATALOG.filter((i) => i.category === filter);
  }, [filter]);

  const handlePurchase = (item: ShopItem) => {
    const result = purchase(item.id);
    if (result.ok) {
      setToast({ kind: "ok", msg: `✓ ${item.name} berhasil dibeli!` });
    } else {
      setToast({ kind: "err", msg: result.reason });
    }
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-violet-900 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              🛒 SuperKupon Shop
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Tukar Coins Lo</h1>
            <p className="mt-1 text-sm text-violet-200">
              Spend coins dari daily login & milestone untuk dapetin boost, badge, & cosmetic eksklusif.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
          >
            ← Kembali
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Coins" value={dlData.totalCoins.toString()} icon="🪙" highlight />
          <Stat label="Total Beli" value={`${invData.totalPurchases}×`} icon="🧾" />
          <Stat label="Permanent" value={invData.ownedPermanent.length.toString()} icon="📦" />
          <Stat
            label="Boost Aktif"
            value={hasActiveBoost("login-boost-2x") ? "×2" : "—"}
            icon="⚡"
            highlight={hasActiveBoost("login-boost-2x")}
          />
        </div>
      </section>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              filter === c.key
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
            ].join(" ")}
          >
            <span aria-hidden className="mr-1">
              {c.emoji}
            </span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            coins={dlData.totalCoins}
            owned={isOwned(item.id)}
            count={consumableCount(item.id)}
            activeBoost={item.id === "login-boost-2x" && hasActiveBoost("login-boost-2x")}
            onBuy={() => handlePurchase(item)}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={[
            "fixed bottom-4 left-1/2 z-[101] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-2xl animate-slide-up",
            toast.kind === "ok"
              ? "bg-emerald-500 text-white"
              : "bg-rose-500 text-white",
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2",
        highlight
          ? "border-amber-300/50 bg-amber-400/10"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-200">
        <span aria-hidden>{icon}</span> {label}
      </div>
      <div className="mt-0.5 text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function ItemCard({
  item,
  coins,
  owned,
  count,
  activeBoost,
  onBuy,
}: {
  item: ShopItem;
  coins: number;
  owned: boolean;
  count: number;
  activeBoost: boolean;
  onBuy: () => void;
}) {
  const canAfford = coins >= item.price;
  const lockedOwned = !item.consumable && owned;

  const flairBadge: Record<NonNullable<ShopItem["flair"]>, { text: string; cls: string }> = {
    new: { text: "BARU", cls: "bg-sky-500" },
    hot: { text: "POPULER", cls: "bg-gradient-to-r from-amber-500 to-orange-500" },
    limited: { text: "LIMITED", cls: "bg-gradient-to-r from-rose-500 to-purple-600" },
  };

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
      {item.flair && (
        <span
          className={[
            "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md",
            flairBadge[item.flair].cls,
          ].join(" ")}
        >
          {flairBadge[item.flair].text}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-3xl dark:from-violet-900/40 dark:to-amber-900/30">
          {item.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{item.name}</h3>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {item.category}
            {item.durationDays ? ` · ${item.durationDays} hari` : ""}
            {item.consumable && count > 0 ? ` · Punya ${count}×` : ""}
          </p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="text-lg" aria-hidden>
            🪙
          </span>
          <span className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">
            {item.price}
          </span>
        </div>

        {activeBoost ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ⚡ AKTIF
          </span>
        ) : lockedOwned ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ✓ DIMILIKI
          </span>
        ) : (
          <button
            type="button"
            onClick={onBuy}
            disabled={!canAfford}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow transition",
              canAfford
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 hover:brightness-110 active:scale-95"
                : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
            ].join(" ")}
          >
            {canAfford ? "Beli" : "Kurang coin"}
          </button>
        )}
      </div>
    </article>
  );
}
