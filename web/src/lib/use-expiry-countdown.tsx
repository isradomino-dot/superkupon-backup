"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/provider";
import { formatExpiry } from "@/lib/api";

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

export type ExpiryUrgency = "expired" | "critical" | "warning" | "normal" | "none";

export interface ExpiryState {
  text: string;
  urgency: ExpiryUrgency;
  isLive: boolean; // true kalau countdown sedang aktif (< 24h)
}

/**
 * Reactive expiry formatter. Auto-ticks tiap detik kalau <1h, tiap 30s kalau 1-24h.
 * Hemat resource: NO interval untuk coupon >24h atau tanpa expiry — fallback ke static formatExpiry.
 */
export function useExpiryCountdown(iso?: string | null): ExpiryState {
  const { t } = useI18n();
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // cleanup previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!iso) return;
    const target = new Date(iso).getTime();
    if (!Number.isFinite(target)) return;

    const setupInterval = () => {
      const msLeft = target - Date.now();
      if (msLeft <= 0) {
        // expired — one final tick, no more interval
        setTick((n) => n + 1);
        return;
      }
      if (msLeft > MS_DAY) {
        // not live yet, no interval
        return;
      }
      const rate = msLeft <= MS_HOUR ? 1000 : 30_000;
      intervalRef.current = setInterval(() => {
        const ms = target - Date.now();
        setTick((n) => n + 1);
        // re-evaluate rate when crossing 1h threshold
        if (ms <= MS_HOUR && rate !== 1000 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setupInterval();
        }
        if (ms <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, rate);
    };

    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [iso]);

  if (!iso) return { text: formatExpiry(undefined, t), urgency: "none", isLive: false };
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return { text: "—", urgency: "none", isLive: false };

  const msLeft = target - Date.now();

  if (msLeft <= 0) {
    return { text: "Sudah berakhir", urgency: "expired", isLive: false };
  }

  if (msLeft <= MS_HOUR) {
    const m = Math.floor(msLeft / MS_MIN);
    const s = Math.floor((msLeft % MS_MIN) / 1000);
    return {
      text: `${m}m ${String(s).padStart(2, "0")}d`,
      urgency: "critical",
      isLive: true,
    };
  }

  if (msLeft <= MS_DAY) {
    const h = Math.floor(msLeft / MS_HOUR);
    const m = Math.floor((msLeft % MS_HOUR) / MS_MIN);
    return {
      text: `${h}j ${String(m).padStart(2, "0")}m`,
      urgency: "warning",
      isLive: true,
    };
  }

  // > 24 hours — use existing static formatter
  return { text: formatExpiry(iso, t), urgency: "normal", isLive: false };
}
