"use client";

import { useEffect, useRef } from "react";

import { isAbortError, listCoupons } from "@/lib/api";
import { useSavedSearches } from "@/lib/use-saved-searches";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_DELAY_MS = 8_000;

/**
 * Background watcher for user's saved search queries.
 * Polls each saved query every 5 min via listCoupons(q=...).
 * Fires browser notification for new matching coupons not previously notified.
 * Mount once in layout. Invisible component.
 */
export function SavedSearchWatcher() {
  const { searches, markNotified } = useSavedSearches();
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (searches.length === 0) return;

    const check = async () => {
      if (Notification.permission !== "granted") return;

      inflightRef.current?.abort();
      const ctrl = new AbortController();
      inflightRef.current = ctrl;

      for (const s of searches) {
        if (ctrl.signal.aborted) break;
        try {
          const matches = await listCoupons(
            { q: s.query, limit: 20, sort: "newest" },
            { signal: ctrl.signal },
          );
          if (ctrl.signal.aborted) break;

          const seenIds = new Set(s.notifiedCouponIds);
          const fresh = matches.filter((c) => !seenIds.has(c.id));

          if (fresh.length === 0) {
            // still update lastChecked so user sees we polled
            markNotified(s.id, []);
            continue;
          }

          // Single grouped notification per query (avoid spam)
          const top = fresh[0];
          try {
            const notif = new Notification(
              `🔔 ${fresh.length} kupon baru match "${s.query}"`,
              {
                body:
                  fresh.length === 1
                    ? `${top.merchant.name}: ${top.title}`
                    : `Termasuk: ${top.merchant.name} — ${top.title}`,
                icon: "/icon-192.svg",
                tag: `saved-search-${s.id}`,
                requireInteraction: false,
              },
            );
            notif.onclick = () => {
              window.focus();
              window.location.href = `/?q=${encodeURIComponent(s.query)}`;
              notif.close();
            };
          } catch {
            /* notification failed silently */
          }

          markNotified(
            s.id,
            fresh.map((c) => c.id),
          );
        } catch (e) {
          if (!isAbortError(e)) {
            /* silent — network error */
          }
        }
      }
    };

    const initialTimer = setTimeout(check, INITIAL_DELAY_MS);
    const intervalTimer = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      inflightRef.current?.abort();
    };
    // Re-run kalau jumlah saved searches berubah (add/remove)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searches.length]);

  return null;
}
