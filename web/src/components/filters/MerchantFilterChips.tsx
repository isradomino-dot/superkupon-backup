"use client";

import type { MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";

interface Props {
  merchants: MerchantWithCount[];
  activeSlug?: string;
  onSelect: (slug: string | undefined) => void;
}

export function MerchantFilterChips({ merchants, activeSlug, onSelect }: Props) {
  if (merchants.length === 0) return null;
  const hasActive = activeSlug !== undefined;

  return (
    <div className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-500/30 [&::-webkit-scrollbar-track]:bg-transparent">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        aria-pressed={!hasActive}
        className={[
          "flex flex-none snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          !hasActive
            ? "bg-brand-500 text-white shadow-glow ring-2 ring-brand-400/30"
            : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10 hover:text-white",
        ].join(" ")}
      >
        <span aria-hidden>🎯</span>
        <span>Semua Merchant</span>
      </button>
      {merchants.map((m) => {
        const active = activeSlug === m.slug;
        return (
          <button
            key={m.slug}
            type="button"
            onClick={() => onSelect(active ? undefined : m.slug)}
            aria-pressed={active}
            title={`${m.name} · ${m.coupon_count} kupon`}
            className={[
              "flex flex-none snap-start items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition",
              active
                ? "bg-brand-500 text-white shadow-glow ring-2 ring-brand-400/30"
                : "border border-white/15 bg-white/5 text-gray-300 hover:border-brand-400 hover:bg-brand-500/10 hover:text-white",
            ].join(" ")}
          >
            <MerchantLogo merchant={m} size={16} rounded="full" />
            <span className="font-medium">{m.name}</span>
            <span
              className={[
                "rounded-full px-1.5 py-0 text-[10px]",
                active
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
              ].join(" ")}
            >
              {m.coupon_count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
