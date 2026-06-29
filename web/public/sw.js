/* eslint-disable no-restricted-globals */
/**
 * SuperKupon Service Worker — KILL-SWITCH MODE (sk-v6-killswitch)
 *
 * Purpose:
 *   This SW exists solely to *uninstall* any previously-registered SuperKupon
 *   service worker (sk-v3/v4/v5) on existing user browsers. It must be served
 *   with `Cache-Control: no-store` (see next.config.ts /sw.js header) so the
 *   browser refetches it within 24h and the byte-diff triggers an SW update,
 *   which then self-destructs.
 *
 * Why kill-switch instead of just deleting sw.js:
 *   If /sw.js returns 404, existing registrations stay active and the user
 *   remains controlled by stale sk-v5. We need an active activate() that
 *   calls `registration.unregister()` to fully evict.
 *
 * Critically:
 *   - NO `fetch` handler. Absence = browser default = network passthrough.
 *   - NO `push` / `notificationclick` handlers. Push notif intentionally
 *     dropped (PWA install + in-app toast + email digest sufficient per
 *     coupon-aggregator UX).
 *   - NO `controllerchange`-triggering side effects beyond the one-time
 *     navigate() in activate(), which is needed for clean state recovery.
 *
 * Retention:
 *   Keep this file deployed indefinitely (or at minimum ~30 days until
 *   active-user SW cleanup window closes). See next.config.ts comment.
 */

const SW_VERSION = "sk-v6-killswitch";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Clear all caches from previous SW versions (sk-v3/v4/v5)
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // ignore
      }

      // 2. Self-unregister this SW. After this resolves, the page is no
      //    longer controlled by any service worker.
      try {
        await self.registration.unregister();
      } catch {
        // ignore
      }

      // 3. Force-reload every open tab so the user sees a controller-less
      //    state immediately (no stale fetch interception, no `controllerchange`
      //    race). The reload completes before the cleanup-only registrar
      //    re-runs, so getRegistrations() returns empty as expected.
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => {
          try {
            client.navigate(client.url);
          } catch {
            // ignore — some clients may not allow navigate
          }
        });
      } catch {
        // ignore
      }

      // Tag log for tracking deploy adoption
      // eslint-disable-next-line no-console
      console.log("[SW]", SW_VERSION, "kill-switch executed");
    })(),
  );
});
