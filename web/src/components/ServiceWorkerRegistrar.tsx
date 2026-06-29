"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistrar — CLEANUP-ONLY MODE (post sk-v6-killswitch decision).
 *
 * Context:
 *   Previous mode (sk-v3 → sk-v5) registered /sw.js for push notif + cache.
 *   Race condition between `controllerchange` reload + Next.js App Router
 *   navigation transitions caused "This page couldn't load" on /admin↔/
 *   navigations. Push notif explicitly de-prioritized — admin dashboard
 *   stability is non-negotiable.
 *
 * What this does now:
 *   - NEVER registers a service worker.
 *   - On mount: enumerate any existing registrations from sk-v3/v4/v5 era
 *     and unregister them. Clear all Cache Storage entries. This is a
 *     double-safety net — the kill-switch /sw.js itself also self-unregisters
 *     during its activate event, but we belt-and-suspenders here in case the
 *     kill-switch already ran on a previous load and left a stale flag.
 *   - sessionStorage guard `sk-sw-cleaned` ensures cleanup runs once per tab
 *     session (avoid redundant work on SPA navigation).
 *
 * What this does NOT do:
 *   - No `register()` call. No `update()` polling. No `controllerchange`
 *     listener. No `updatefound` listener. No reload triggers. No UI.
 *
 * Restoration path (future):
 *   If push notif becomes a priority, build new SW with isolated scope
 *   (e.g. `/push-sw.js` registered only on opt-in via PushSubscribeButton),
 *   and keep `/sw.js` as kill-switch forever.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Guard: only run cleanup once per tab session
    try {
      if (window.sessionStorage.getItem("sk-sw-cleaned") === "1") return;
    } catch {
      // sessionStorage unavailable (private mode quirks) → proceed anyway
    }

    let cancelled = false;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (cancelled) return;
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      } catch {
        // ignore — getRegistrations can throw in some private contexts
      }

      try {
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          if (cancelled) return;
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        }
      } catch {
        // ignore
      }

      try {
        window.sessionStorage.setItem("sk-sw-cleaned", "1");
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
