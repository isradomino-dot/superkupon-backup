/* eslint-disable no-restricted-globals */
/**
 * SuperKupon Service Worker
 * Strategy:
 *   - Static assets (manifest, offline, icons): cache-first
 *   - Next.js JS/CSS chunks: stale-while-revalidate
 *   - Backend API GET (coupons/merchants/etc): stale-while-revalidate, 5min TTL
 *   - HTML navigation: network-first with offline fallback
 *   - POST/PUT/DELETE: always network, never cached
 */

const SW_VERSION = "sk-v2";
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const API_CACHE = `${SW_VERSION}-api`;

const PRECACHE_URLS = ["/offline.html", "/manifest.json"];

const API_BASE_REGEX = /^https?:\/\/(?:localhost:8001|127\.0\.0\.1:8001|superkupon-backend-production\.up\.railway\.app)\/(?:coupons|merchants|merchants-with-counts|categories|search\/.+|notifications)/i;
const API_TTL_MS = 5 * 60 * 1000; // 5 minutes

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(SW_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Stale-while-revalidate with TTL check.
 * Returns cached response immediately if fresh OR stale; updates in background.
 */
async function staleWhileRevalidate(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchAndCache = fetch(request)
    .then((networkRes) => {
      if (networkRes && networkRes.status === 200) {
        const clone = networkRes.clone();
        // store with date header for TTL tracking
        const headers = new Headers(clone.headers);
        headers.set("x-sw-cached-at", String(Date.now()));
        clone.blob().then((body) => {
          const resWithMeta = new Response(body, {
            status: clone.status,
            statusText: clone.statusText,
            headers,
          });
          cache.put(request, resWithMeta).catch(() => {});
        });
      }
      return networkRes;
    })
    .catch(() => null);

  if (cached) {
    // Check TTL
    const cachedAt = Number(cached.headers.get("x-sw-cached-at") || 0);
    const isFresh = ttlMs && Date.now() - cachedAt < ttlMs;
    if (isFresh) {
      // Still trigger background update (but don't wait)
      fetchAndCache.catch(() => {});
      return cached;
    }
    // Stale — return cached but await background fetch too
    const networkRes = await fetchAndCache;
    return networkRes || cached;
  }

  // No cache — must wait for network
  const networkRes = await fetchAndCache;
  if (networkRes) return networkRes;
  // Network failed, nothing cached
  throw new Error("Offline and no cache");
}

async function networkFirstWithFallback(request) {
  try {
    const networkRes = await fetch(request);
    if (networkRes && networkRes.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkRes.clone()).catch(() => {});
    }
    return networkRes;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // HTML navigation fallback
    if (request.mode === "navigate") {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    throw new Error("Offline and no cache");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const networkRes = await fetch(request);
  if (networkRes && networkRes.status === 200) {
    cache.put(request, networkRes.clone()).catch(() => {});
  }
  return networkRes;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — POSTs/PUTs always pass through
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip cross-origin except backend API
  if (url.origin !== self.location.origin && !API_BASE_REGEX.test(url.href)) {
    return;
  }

  // Skip Next.js dev/HMR WebSocket-related routes
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  // Backend API → stale-while-revalidate
  if (API_BASE_REGEX.test(url.href)) {
    event.respondWith(
      staleWhileRevalidate(request, API_CACHE, API_TTL_MS).catch(() => {
        // API failed AND no cache → return empty JSON so frontend doesn't crash
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    return;
  }

  // Static precache
  if (PRECACHE_URLS.some((p) => url.pathname === p)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Icons / images / fonts → cache-first
  if (
    /\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|otf|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Next.js chunks (/_next/static/*) → stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 0));
    return;
  }

  // HTML navigation → network-first with offline fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default: pass-through
});

// Allow page to trigger SW update / skip waiting
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
