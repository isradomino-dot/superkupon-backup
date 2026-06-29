/* eslint-disable no-restricted-globals */
/**
 * SuperKupon Service Worker — MINIMAL PASSTHROUGH MODE (post sk-v4 bug)
 *
 * History:
 *   sk-v3: full caching strategy (cache-first/stale-while-revalidate per route).
 *          Bug: HTML pages cached → kode tab biasa stuck di versi lama
 *          post-deploy. User report berulang.
 *   sk-v4: bump version + periodic update check. Tetep ada issue propagation.
 *   sk-v5: NUCLEAR REWRITE — SW tidak intercept fetch HTML/static lagi.
 *          Semua page load langsung ke network → no stale issues.
 *          SW HANYA handle push notification (untuk fitur PWA push).
 *
 * Trade-off:
 *   ✅ Tab biasa SELALU fresh post-deploy (zero stale page issues)
 *   ✅ Push notification tetep jalan (lewat push event handler)
 *   ❌ Offline support hilang (kalau internet putus, page gak load)
 *      → Acceptable: SuperKupon = aggregator kupon, butuh internet anyway
 *   ❌ Performance dikit lebih lambat (gak ada SW cache buat asset)
 *      → Negligible: Vercel CDN udah cache static asset di edge
 */

const SW_VERSION = "sk-v5-minimal";

// Install: skip waiting supaya SW baru langsung activate
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate: hapus SEMUA cache lama (sisa dari sk-v3/sk-v4) + claim controllers
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(async () => {
        // Notify all clients ada SW baru aktif → frontend bisa auto-reload
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((client) => {
          client.postMessage({ type: "SW_UPDATED", version: SW_VERSION });
        });
      }),
  );
});

// Fetch: PASSTHROUGH SEMUANYA — tidak intercept, tidak cache.
// Browser handle network fetch + HTTP cache normal (Cache-Control headers).
// JANGAN tambahkan event.respondWith() di sini — biarkan default behavior.
// (Sengaja tidak add fetch listener supaya zero intercept overhead.)

// Allow page to trigger SW skipWaiting (untuk UX "update sekarang" button)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/**
 * Web Push: incoming notification dari server.
 * Payload shape: { title, body, icon?, url? }
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "SuperKupon", body: event.data.text() };
  }
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    tag: "sk-new-coupon",
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "SuperKupon", options),
  );
});

/**
 * Click on push notification → open / focus the target URL.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              const url = new URL(client.url);
              if (url.pathname === targetUrl || client.url.endsWith(targetUrl)) {
                return client.focus();
              }
            } catch {}
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
