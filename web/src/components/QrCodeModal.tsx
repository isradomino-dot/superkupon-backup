"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import { couponSlug } from "@/lib/coupon-slug";
import type { Coupon } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  coupon: Coupon;
  /** Optional URL to encode. Default: coupon detail page URL. */
  url?: string;
}

type QRMode = "url" | "code";

export function QrCodeModal({ open, onClose, coupon, url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<QRMode>("url");
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const slug = couponSlug(coupon);
  const fallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/coupon/${slug}`
      : `/coupon/${slug}`;
  const detailUrl = url ?? fallbackUrl;

  const encodedText = mode === "code" && coupon.code ? coupon.code : detailUrl;

  // Generate QR when modal opens or mode/coupon changes
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    QRCode.toCanvas(canvas, encodedText, {
      width: 260,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .catch(() => {
        /* canvas might be unmounted */
      })
      .finally(() => setGenerating(false));
  }, [open, encodedText]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = `qr-${coupon.merchant.slug}-${coupon.code ?? coupon.id}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-slide-up dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-white">
            📱 QR Code Share
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-gray-500 hover:text-rose-500"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        {coupon.code && (
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <ModeBtn active={mode === "url"} onClick={() => setMode("url")}>
              🔗 URL Detail
            </ModeBtn>
            <ModeBtn active={mode === "code"} onClick={() => setMode("code")}>
              🎟 Kode Promo
            </ModeBtn>
          </div>
        )}

        {/* QR + info */}
        <div className="flex flex-col items-center gap-3 p-6">
          <div className="rounded-lg bg-white p-3 shadow-lg">
            <canvas
              ref={canvasRef}
              className={generating ? "opacity-50" : ""}
              aria-label={`QR code untuk ${mode === "url" ? "URL detail kupon" : "kode promo"}`}
            />
          </div>

          <div className="w-full">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {mode === "url" ? "URL Encoded" : "Kode Encoded"}
            </div>
            <div className="mt-1 break-all rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-[11px] text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {encodedText}
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
            <strong className="text-gray-700 dark:text-gray-200">
              {coupon.merchant.name}: {coupon.title}
            </strong>
            <br />
            Scan dengan kamera HP untuk{" "}
            {mode === "url" ? "buka detail kupon" : "auto-fill kode promo"}
          </p>

          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-600"
          >
            {downloaded ? "✓ Tersimpan!" : "⬇ Download PNG"}
          </button>
        </div>

        <footer className="border-t border-gray-200 bg-gray-50 px-5 py-2 text-center text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-950/50">
          Tekan Esc atau klik luar untuk tutup
        </footer>
      </div>
    </div>
  );
}

function ModeBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 border-b-2 px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
