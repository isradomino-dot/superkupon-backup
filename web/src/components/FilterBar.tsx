"use client";

import { useI18n } from "@/i18n/provider";
import { useCountUp } from "@/lib/use-count-up";

export type SortKey = "newest" | "popular" | "discount" | "expiring" | "quality";

interface FilterBarProps {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  minQuality: number;
  onMinQualityChange: (q: number) => void;
  totalCount?: number;
}

export function FilterBar({
  sort,
  onSortChange,
  minQuality,
  onMinQualityChange,
  totalCount,
}: FilterBarProps) {
  const { t } = useI18n();
  const animatedCount = useCountUp(totalCount ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">{t("filter.sort")}:</label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="newest">{t("filter.sort_newest")}</option>
          <option value="popular">{t("filter.sort_popular")}</option>
          <option value="discount">{t("filter.sort_discount")}</option>
          <option value="expiring">{t("filter.sort_expiring")}</option>
          <option value="quality">{t("filter.sort_quality")}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">{t("filter.quality")}:</label>
        <select
          value={minQuality}
          onChange={(e) => onMinQualityChange(Number(e.target.value))}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value={0}>{t("filter.all")}</option>
          <option value={80}>≥80% (excellent)</option>
          <option value={90}>≥90% (top tier)</option>
        </select>
      </div>

      {totalCount !== undefined && (
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          <span className="font-bold tabular-nums text-gray-700 dark:text-gray-200">
            {animatedCount}
          </span>{" "}
          kupon
        </span>
      )}
    </div>
  );
}
