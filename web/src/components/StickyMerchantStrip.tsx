"use client";

import { useEffect, useRef, useState } from "react";

import type { MerchantWithCount } from "@/lib/types";
import { MerchantLogo } from "@/components/MerchantLogo";
import { SmartLink } from "@/components/SmartLink";

interface Props {
  merchants: MerchantWithCount[];
  /** DOM id of the main merchant pills section to watch for scroll-past. */
  watchElementId: string;
}

const MAX_VISIBLE = 12;

/**
 * Mini horizontal merchant strip that appears only when user has scrolled
 * past the main merchant pills section (avoids redundancy).
 *
 * Mount inside a sticky container so it inherits stick positioning.
 */
export function StickyMerchantStrip({ merchants, watchElementId }: Props) {
  const [scrolledPast, setScrolledPast] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(watchElementId);
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        // Show strip when watched element ISN'T intersecting (= scrolled past)
        setScrolledPast(!entry.isIntersecting);
      },
      {
        // Trigger slightly before fully off-screen to avoid flicker
        rootMargin: "-50px 0px 0px 0px",
        threshold: 0,
      },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [watchElementId]);

  if (!scrolledPast || merchants.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      role="navigation"
      aria-label="Merchant quick switch"
      className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-500/30 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-transparent"
    >
      {merchants.slice(0, MAX_VISIBLE).map((m) => (
        <SmartLink
          key={m.slug}
          href={`/merchant/${m.slug}`}
          className="flex flex-none snap-start items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-gray-700"
          title={`${m.name} · ${m.coupon_count} kupon`}
        >
          <MerchantLogo merchant={m} size={16} rounded="full" />
          <span className="font-medium">{m.name}</span>
          <span className="rounded-full bg-gray-100 px-1.5 py-0 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {m.coupon_count}
          </span>
        </SmartLink>
      ))}
      {merchants.length > MAX_VISIBLE && (
        <span className="flex flex-none items-center px-2 text-[10px] text-gray-400">
          +{merchants.length - MAX_VISIBLE} more
        </span>
      )}
    </div>
  );
}
