"use client";

import { useCallback, useEffect, useState } from "react";

import {
  arePushNotificationsSupported,
  getCurrentSubscription,
  isSubscribedLocal,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "@/lib/push-notification";

type Status = "idle" | "loading" | "subscribed" | "unsupported" | "denied";

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // On mount: detect support + sync state with browser + localStorage.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!arePushNotificationsSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const sub = await getCurrentSubscription();
      if (cancelled) return;
      if (sub) {
        setStatus("subscribed");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("sk_push_subscribed", "1");
        }
      } else {
        // Clean up stale localStorage flag if browser sub is gone
        if (isSubscribedLocal() && typeof window !== "undefined") {
          window.localStorage.removeItem("sk_push_subscribed");
        }
        setStatus("idle");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = useCallback(async () => {
    setStatus("loading");
    setMessage(null);
    const result = await subscribeUserToPush();
    if (result.ok) {
      setStatus("subscribed");
      setMessage("Notif kupon baru aktif!");
      setTimeout(() => setMessage(null), 3000);
    } else {
      // Permission denied → lock the button so it doesn't keep asking
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "denied"
      ) {
        setStatus("denied");
      } else {
        setStatus("idle");
      }
      setMessage(result.error || "Gagal mengaktifkan notif");
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setStatus("loading");
    setMessage(null);
    const ok = await unsubscribeUserFromPush();
    if (ok) {
      setStatus("idle");
      setMessage("Notif dimatikan");
      setTimeout(() => setMessage(null), 3000);
    } else {
      setStatus("subscribed");
      setMessage("Gagal mematikan notif");
    }
  }, []);

  if (status === "unsupported" || status === "denied") {
    return null;
  }

  const isSubscribed = status === "subscribed";
  const isLoading = status === "loading";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isLoading}
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        aria-pressed={isSubscribed}
        className={[
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
          "disabled:cursor-wait disabled:opacity-60",
          isSubscribed
            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            : "bg-brand-500/15 text-brand-300 hover:bg-brand-500/25",
        ].join(" ")}
        title={
          isSubscribed
            ? "Klik untuk matikan notif push"
            : "Aktifkan notif kupon baru via push"
        }
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <span>Memproses…</span>
          </>
        ) : isSubscribed ? (
          <span>Notif aktif (matikan)</span>
        ) : (
          <span>Aktifkan Notif Kupon Baru</span>
        )}
      </button>
      {message && (
        <div
          role="status"
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-white/10 bg-[#1a1822] px-2 py-1 text-[11px] text-gray-200 shadow-lg"
        >
          {message}
        </div>
      )}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
