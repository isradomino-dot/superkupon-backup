"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DELAY = 150;
/** Cache to dedup prefetches across the session. */
const prefetched = new Set<string>();

/**
 * Return handlers to attach to any element. Triggers Next.js router prefetch
 * after `delay` ms of continuous hover. Cancels on mouse leave.
 *
 * Usage:
 *   const handlers = usePrefetchOnHover('/merchant/shopee');
 *   <Link href="/merchant/shopee" {...handlers}>Shopee</Link>
 */
export function usePrefetchOnHover(href: string, delay = DEFAULT_DELAY) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (prefetched.has(href)) return;
    cancel();
    timerRef.current = setTimeout(() => {
      try {
        router.prefetch(href);
        prefetched.add(href);
      } catch {
        /* ignore — prefetch is best-effort */
      }
    }, delay);
  }, [href, delay, router, cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return {
    onMouseEnter: start,
    onFocus: start,
    onTouchStart: start,
    onMouseLeave: cancel,
    onBlur: cancel,
  };
}
