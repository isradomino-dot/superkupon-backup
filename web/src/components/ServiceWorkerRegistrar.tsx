"use client";

import { useEffect, useState } from "react";

/**
 * Registers /sw.js on mount. Shows a toast when a new SW is waiting,
 * with "Update sekarang" CTA to skip-waiting + reload.
 *
 * Skipped on localhost dev unless NEXT_PUBLIC_SW_ENABLED=true is set,
 * to avoid interfering with HMR.
 */
export function ServiceWorkerRegistrar() {
  const [updateWaiting, setUpdateWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const swEnabled = process.env.NEXT_PUBLIC_SW_ENABLED === "true";

    // In dev/localhost: only register if explicitly enabled
    if (isLocalhost && !swEnabled) {
      // Also unregister any existing SW to avoid stale dev cache
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Detect when an updated SW is waiting to activate
          if (reg.waiting) setUpdateWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateWaiting(installing);
              }
            });
          });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("[SW] registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  // Reload page after new SW takes control
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const applyUpdate = () => {
    updateWaiting?.postMessage("SKIP_WAITING");
    setUpdateWaiting(null);
  };

  if (!updateWaiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[120] max-w-xs animate-slide-up rounded-xl border border-brand-400/40 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-2xl"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-xl">🔄</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Versi baru tersedia</div>
          <div className="mt-0.5 text-xs text-gray-300">
            Update SuperKupon ke versi terbaru biar dapat fitur baru.
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={applyUpdate}
              className="rounded-md bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-600"
            >
              Update sekarang
            </button>
            <button
              type="button"
              onClick={() => setUpdateWaiting(null)}
              className="rounded-md border border-gray-600 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
