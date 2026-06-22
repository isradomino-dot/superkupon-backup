/**
 * Web Push notification helpers (client-side).
 *
 * Flow:
 *   1. Check support
 *   2. Request Notification permission
 *   3. Fetch VAPID public key from backend (or env)
 *   4. Subscribe via PushManager
 *   5. POST subscription to backend
 *
 * Backend contract:
 *   GET  /push/vapid-public-key   → { publicKey: string }
 *   POST /push/subscribe          → { endpoint, keys: { p256dh, auth }, user_agent? }
 *   POST /push/unsubscribe        → { endpoint }
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

const VAPID_PUBLIC_KEY_ENV = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const LS_KEY = "sk_push_subscribed";

export interface PushSubscribeResult {
  ok: boolean;
  subscription?: PushSubscription;
  error?: string;
}

/**
 * Detect Web Push support — needs SW + PushManager + Notification API.
 */
export function arePushNotificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Ask the browser for Notification permission.
 * Returns the resulting permission ('granted' | 'denied' | 'default').
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!arePushNotificationsSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Convert a base64url-encoded VAPID public key into the ArrayBuffer form
 * PushManager.subscribe() expects.
 *
 * Returns ArrayBuffer (not Uint8Array<SharedArrayBuffer>) so it satisfies the
 * stricter `BufferSource` type the lib.dom typings now require for
 * applicationServerKey.
 */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined" ? window.atob(base64) : "";
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/**
 * Fetch the VAPID public key — prefer env var, fall back to backend endpoint.
 */
async function fetchVapidPublicKey(): Promise<string | null> {
  if (VAPID_PUBLIC_KEY_ENV) return VAPID_PUBLIC_KEY_ENV;
  try {
    const res = await fetch(`${API_BASE}/push/vapid-public-key`);
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current push subscription for this browser, or null.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!arePushNotificationsSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe the current user to push notifications.
 * Idempotent — if an existing subscription is found, reuse it.
 */
export async function subscribeUserToPush(): Promise<PushSubscribeResult> {
  if (!arePushNotificationsSupported()) {
    return { ok: false, error: "Browser tidak support push notification" };
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Izin notifikasi ditolak" };
  }

  const reg = await navigator.serviceWorker.ready;

  // Reuse existing sub if present
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await sendSubscriptionToBackend(existing);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, "1");
    }
    return { ok: true, subscription: existing };
  }

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, error: "VAPID public key tidak tersedia" };
  }

  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal subscribe push",
    };
  }

  const sent = await sendSubscriptionToBackend(subscription);
  if (!sent) {
    // Roll back local sub if backend rejected
    try {
      await subscription.unsubscribe();
    } catch {}
    return { ok: false, error: "Backend menolak subscription" };
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_KEY, "1");
  }
  return { ok: true, subscription };
}

/**
 * Unsubscribe the current browser from push.
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!arePushNotificationsSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LS_KEY);
      }
      return true;
    }
    const endpoint = sub.endpoint;
    const unsubbed = await sub.unsubscribe();
    // Best-effort backend cleanup — don't block UI if it fails
    try {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
    return unsubbed;
  } catch {
    return false;
  }
}

/**
 * POST subscription to backend so server can push to it later.
 */
async function sendSubscriptionToBackend(
  sub: PushSubscription,
): Promise<boolean> {
  const json = sub.toJSON();
  const payload = {
    endpoint: json.endpoint,
    keys: json.keys,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
  try {
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Helper for UI components to read local persisted state.
 */
export function isSubscribedLocal(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_KEY) === "1";
}
