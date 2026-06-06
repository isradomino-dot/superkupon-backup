"use client";

import { useCallback, useEffect, useState } from "react";

import type { Coupon } from "@/lib/types";

const STORAGE_KEY = "sk_recently_viewed_v1";
const MAX_RECENT = 12;

export interface RecentViewRecord {
  id: number;
  title: string;
  code: string | null;
  merchantSlug: string;
  merchantName: string;
  merchantWebsite: string | null;
  discountType: string;
  discountValue: number;
  viewedAt: number;
}

export function useRecentlyViewed() {
  const [records, setRecords] = useState<RecentViewRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecords(
            parsed.filter(
              (r): r is RecentViewRecord =>
                r && typeof r.id === "number" && typeof r.title === "string",
            ),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      /* ignore */
    }
  }, [records, hydrated]);

  const record = useCallback((coupon: Coupon) => {
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== coupon.id);
      const next: RecentViewRecord = {
        id: coupon.id,
        title: coupon.title,
        code: coupon.code ?? null,
        merchantSlug: coupon.merchant.slug,
        merchantName: coupon.merchant.name,
        merchantWebsite: coupon.merchant.website ?? null,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        viewedAt: Date.now(),
      };
      return [next, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const remove = useCallback((id: number) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(() => setRecords([]), []);

  return { records, count: records.length, record, remove, clear, hydrated };
}
