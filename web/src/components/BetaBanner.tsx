"use client";

import { useEffect, useState } from "react";

/**
 * Transparent disclaimer banner buat V1 Beta.
 * Acknowledge sample data + komunikasi roadmap real kupon ke user.
 * Dismissible — state disimpan di localStorage biar gak nyusahin returning visitor.
 *
 * Versioned key (sk_beta_banner_dismissed_v2) — bump suffix kalau message berubah
 * biar banner re-appear ke user yang udah dismiss versi sebelumnya.
 */
const STORAGE_KEY = "sk_beta_banner_dismissed_v2";

export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== "1") setVisible(true);
    } catch {
      // localStorage blocked (private mode, etc) — default tampil banner
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative z-30 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 backdrop-blur-sm">
      <div className="container-app flex items-center justify-between gap-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 text-xs leading-snug text-amber-100 sm:text-sm">
          <span aria-hidden className="flex-shrink-0 text-base sm:text-lg">
            🚧
          </span>
          <p className="min-w-0">
            <strong className="font-semibold text-amber-200">V1 Beta:</strong>{" "}
            Sample data untuk uji fitur — kupon real dari{" "}
            <span className="text-amber-200/90">Shopee, Tokopedia, Lazada, Traveloka</span>{" "}
            menyusul via partner affiliate resmi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-md px-2 py-1 text-base font-semibold leading-none text-amber-300/80 transition hover:bg-amber-500/20 hover:text-amber-100"
          aria-label="Tutup banner beta"
          title="Tutup"
        >
          ×
        </button>
      </div>
    </div>
  );
}
