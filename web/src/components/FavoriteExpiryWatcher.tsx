"use client";

import { useEffect, useRef } from "react";

import { getCouponsByIds, isAbortError } from "@/lib/api";
import { useFavorites } from "@/lib/use-favorites";

const STORAGE_KEY = "sk_expiry_notified_v1";
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const WARN_WITHIN_HOURS = 72; // 3 days
const MS_HOUR = 60 * 60 * 1000;

interface NotifiedMap {
  [couponId: number]: number; // timestamp of last notification
}

function loadNotified(): NotifiedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveNotified(map: NotifiedMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Background watcher for user's favorites:
 * - polls backend every 10 min
 * - if any favorited coupon expires within 72h AND we haven't notified about it
 *   in the last 24h, fires a browser notification.
 * - de-duped via localStorage.
 *
 * Mount once in layout. Returns null (invisible).
 */
export function FavoriteExpiryWatcher() {
  const { ids } = useFavorites();
  const idsKey = ids.join(",");
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (ids.length === 0) return;

    const check = async () => {
      inflightRef.current?.abort();
      const ctrl = new AbortController();
      inflightRef.current = ctrl;

      try {
        const list = await getCouponsByIds(ids, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (Notification.permission !== "granted") return;

        const now = Date.now();
        const notified = loadNotified();
        const expiringSoon = list.filter((c) => {
          if (!c.expires_at) return false;
          const exp = new Date(c.expires_at).getTime();
          if (!Number.isFinite(exp)) return false;
          const hoursLeft = (exp - now) / MS_HOUR;
          return hoursLeft > 0 && hoursLeft <= WARN_WITHIN_HOURS;
        });

        let changed = false;
        for (const c of expiringSoon) {
          const last = notified[c.id] ?? 0;
          // re-notify if we haven't notified about this coupon in last 24h
          if (now - last < 24 * MS_HOUR) continue;

          const hoursLeft = Math.round(
            (new Date(c.expires_at!).getTime() - now) / MS_HOUR,
          );
          const days = Math.floor(hoursLeft / 24);
          const timeLabel = days >= 1 ? `${days} hari` : `${hoursLeft} jam`;

          try {
            const notif = new Notification(`⏰ Kupon favorit hampir expired`, {
              body: `${c.merchant.name} · ${c.title}\nSisa ${timeLabel}. Jangan sampai kelewat!`,
              icon: "/icon-192.svg",
              tag: `expiry-${c.id}`,
              requireInteraction: false,
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = `/coupon/${c.id}`;
              notif.close();
            };
            notified[c.id] = now;
            changed = true;
          } catch {
            /* notification failed silently */
          }
        }

        if (changed) saveNotified(notified);
      } catch (e) {
        if (!isAbortError(e)) {
          /* network down — silent */
        }
      }
    };

    // Initial run after 5s settle, then interval
    const initialTimer = setTimeout(check, 5000);
    const intervalTimer = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      inflightRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return null;
}
