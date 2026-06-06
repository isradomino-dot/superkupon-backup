"use client";

import { useEffect, useState } from "react";

const VISITS_KEY = "sk_pwa_visits_v1";
const DISMISSED_KEY = "sk_pwa_dismissed_v1";
const MIN_VISITS_BEFORE_PROMPT = 3;
const DISMISS_COOLDOWN_DAYS = 7;
const MS_DAY = 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !("MSStream" in window);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  if ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  return false;
}

function bumpVisits(): number {
  if (typeof window === "undefined") return 0;
  try {
    const cur = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
    localStorage.setItem(VISITS_KEY, String(cur));
    return cur;
  } catch {
    return 0;
  }
}

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_COOLDOWN_DAYS * MS_DAY;
  } catch {
    return false;
  }
}

function recordDismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function PWAInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showIOSDetail, setShowIOSDetail] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return; // already installed, no banner
    if (isRecentlyDismissed()) return;

    const visits = bumpVisits();

    // iOS Safari path — no beforeinstallprompt event, manual hint
    if (isIOSSafari()) {
      if (visits >= MIN_VISITS_BEFORE_PROMPT) {
        setShowIOSHint(true);
      }
      return;
    }

    // Chrome/Edge/Android — listen for native event
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      if (visits >= MIN_VISITS_BEFORE_PROMPT) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If event fired before mount, browser may have stored it — show after threshold anyway
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      } else {
        recordDismiss();
        setShow(false);
      }
    } catch {
      setShow(false);
    } finally {
      setPromptEvent(null);
    }
  };

  const handleDismiss = () => {
    recordDismiss();
    setShow(false);
    setShowIOSHint(false);
  };

  // Native install banner
  if (show && promptEvent) {
    return (
      <BannerShell onDismiss={handleDismiss}>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">📱 Install SuperKupon</div>
          <div className="text-[11px] text-gray-300">
            Akses cepat dari home screen — full screen, no browser chrome
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-brand-600"
        >
          📥 Install
        </button>
      </BannerShell>
    );
  }

  // iOS Safari hint banner
  if (showIOSHint) {
    return (
      <>
        <BannerShell onDismiss={handleDismiss}>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">📱 Add to Home Screen</div>
            <div className="text-[11px] text-gray-300">
              Akses SuperKupon kayak app — tap Share → "Add to Home Screen"
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSDetail(true)}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-brand-600"
          >
            Cara nya
          </button>
        </BannerShell>
        {showIOSDetail && (
          <IOSInstructions onClose={() => setShowIOSDetail(false)} />
        )}
      </>
    );
  }

  return null;
}

function BannerShell({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-[110] w-full max-w-md -translate-x-1/2 px-4 animate-slide-up">
      <div className="flex items-center gap-3 rounded-xl border border-brand-400/30 bg-gradient-to-br from-slate-900 via-violet-900/30 to-slate-900 p-3 shadow-2xl backdrop-blur">
        {children}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup banner install"
          title="Tutup (gak muncul 7 hari)"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up">
        <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-base font-bold text-white">📱 Add to Home Screen (iOS)</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </header>
        <ol className="space-y-3 p-5 text-sm text-gray-200">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              1
            </span>
            <span>
              Tap tombol <strong>Share</strong> (kotak dengan panah ke atas) di bottom bar Safari
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              2
            </span>
            <span>
              Scroll list action → tap <strong>&quot;Add to Home Screen&quot;</strong> (icon kotak dengan +)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
              3
            </span>
            <span>
              Tap <strong>&quot;Add&quot;</strong> di pojok kanan atas. SuperKupon icon bakal muncul di home screen
            </span>
          </li>
        </ol>
        <footer className="border-t border-gray-700 bg-gray-950/50 px-4 py-2 text-center text-[10px] text-gray-500">
          Setelah install, app jalan full-screen tanpa Safari chrome
        </footer>
      </div>
    </div>
  );
}
