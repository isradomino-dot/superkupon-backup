"use client";

import type { MerchantWithCount } from "@/lib/types";
import type { QuickFilterState } from "@/components/QuickFilters";
import type { SortKey } from "@/components/FilterBar";

interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  quick: QuickFilterState;
  setQuick: (next: QuickFilterState) => void;
  q: string;
  onClearSearch: () => void;
  sort: SortKey;
  setSort: (next: SortKey) => void;
  minQuality: number;
  setMinQuality: (next: number) => void;
  merchants: MerchantWithCount[];
}

const DISCOUNT_TYPE_LABEL: Record<string, string> = {
  percent: "Diskon Persen",
  fixed: "Diskon Rupiah",
  cashback: "Cashback",
  bogo: "Beli 1 Gratis 1",
  free_shipping: "Gratis Ongkir",
};

const REGION_LABEL: Record<string, string> = {
  jakarta: "Jakarta",
  bandung: "Bandung",
  surabaya: "Surabaya",
  local: "Lokal Indonesia",
  national: "Nasional",
};

export function ActiveFiltersBar({
  quick,
  setQuick,
  q,
  onClearSearch,
  sort,
  setSort,
  minQuality,
  setMinQuality,
  merchants,
}: Props) {
  const chips: FilterChip[] = [];

  if (q) {
    chips.push({
      id: "q",
      label: `🔍 "${q}"`,
      onRemove: onClearSearch,
    });
  }

  if (quick.merchant) {
    const merchant = merchants.find((m) => m.slug === quick.merchant);
    chips.push({
      id: "merchant",
      label: `🏪 ${merchant?.name ?? quick.merchant}`,
      onRemove: () => setQuick({ ...quick, merchant: undefined }),
    });
  }

  if (quick.category) {
    chips.push({
      id: "category",
      label: `📂 ${quick.category}`,
      onRemove: () => setQuick({ ...quick, category: undefined }),
    });
  }

  if (quick.discountType) {
    chips.push({
      id: "discountType",
      label: `💸 ${DISCOUNT_TYPE_LABEL[quick.discountType] ?? quick.discountType}`,
      onRemove: () => setQuick({ ...quick, discountType: undefined }),
    });
  }

  if (quick.minDiscount && quick.minDiscount > 0) {
    chips.push({
      id: "minDiscount",
      label: `📈 ≥${quick.minDiscount}%`,
      onRemove: () => setQuick({ ...quick, minDiscount: undefined }),
    });
  }

  if (quick.region) {
    chips.push({
      id: "region",
      label: `📍 ${REGION_LABEL[quick.region] ?? quick.region}`,
      onRemove: () => setQuick({ ...quick, region: undefined }),
    });
  }

  if (sort !== "newest") {
    const sortLabel =
      sort === "popular"
        ? "Populer"
        : sort === "discount"
          ? "Diskon Terbesar"
          : sort === "expiring"
            ? "Hampir Berakhir"
            : sort === "quality"
              ? "Kualitas Tinggi"
              : sort;
    chips.push({
      id: "sort",
      label: `↕ ${sortLabel}`,
      onRemove: () => setSort("newest"),
    });
  }

  if (minQuality > 0) {
    chips.push({
      id: "minQuality",
      label: `⭐ Kualitas ≥${minQuality}`,
      onRemove: () => setMinQuality(0),
    });
  }

  if (chips.length === 0) return null;

  const clearAll = () => {
    setQuick({});
    setSort("newest");
    setMinQuality(0);
    if (q) onClearSearch();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-400/30 bg-brand-500/5 p-3 text-xs">
      <span className="font-semibold uppercase tracking-wide text-brand-300">
        Filter aktif:
      </span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          aria-label={`Hapus filter ${c.label}`}
          className="group inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2.5 py-1 text-brand-100 transition hover:bg-rose-500/30 hover:text-white"
        >
          <span>{c.label}</span>
          <span aria-hidden className="text-rose-300 group-hover:text-white">
            ✕
          </span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded-full border border-rose-400/40 px-2.5 py-1 text-rose-300 transition hover:bg-rose-500/20 hover:text-white"
        >
          Hapus semua
        </button>
      )}
    </div>
  );
}
