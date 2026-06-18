"use client";

import { useEffect, useRef, useState } from "react";

import type { Coupon } from "@/lib/types";
import { couponSlug } from "@/lib/coupon-slug";
import { QrCodeModal } from "@/components/QrCodeModal";

interface Props {
  coupon: Coupon;
}

export function ShareButton({ coupon }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const slug = couponSlug(coupon);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/coupon/${slug}`
      : `/coupon/${slug}`;

  const message = formatMessage(coupon, url);
  const tgText = `${coupon.merchant.name}: ${coupon.title}${
    coupon.code ? ` · Kode: ${coupon.code}` : ""
  }`;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Try native Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${coupon.merchant.name}: ${coupon.title}`,
          text: message,
          url,
        });
        return;
      } catch {
        // User cancelled or unsupported — fall through to dropdown
      }
    }
    setOpen((v) => !v);
  };

  const shareWA = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const shareTG = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `https://t.me/share/url?url=${encodeURIComponent(
      url
    )}&text=${encodeURIComponent(tgText)}`;
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Bagikan kupon"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Bagikan kupon"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition hover:bg-brand-500/15 hover:text-brand-300"
      >
        <ShareIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-lg border border-white/10 bg-[#1e1b2e] py-1 shadow-2xl"
        >
          <ShareMenuItem
            onClick={shareWA}
            label="WhatsApp"
            icon={<WhatsAppIcon />}
            color="text-emerald-400"
          />
          <ShareMenuItem
            onClick={shareTG}
            label="Telegram"
            icon={<TelegramIcon />}
            color="text-sky-400"
          />
          <div className="my-1 border-t border-white/5" />
          <ShareMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQrOpen(true);
              setOpen(false);
            }}
            label="QR Code"
            icon={<QrIcon />}
            color="text-violet-400"
          />
          <ShareMenuItem
            onClick={copyLink}
            label={copied ? "✓ Link tersalin!" : "Copy link"}
            icon={copied ? <CheckIcon /> : <LinkIcon />}
            color={copied ? "text-emerald-400" : "text-gray-300"}
          />
        </div>
      )}

      <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} coupon={coupon} url={url} />
    </div>
  );
}

function ShareMenuItem({
  onClick,
  label,
  icon,
  color,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-100 transition hover:bg-white/5"
    >
      <span className={["flex h-7 w-7 items-center justify-center", color].join(" ")}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function formatMessage(c: Coupon, url: string): string {
  const lines = [`🎟️ ${c.merchant.name}: ${c.title}`];
  if (c.code) lines.push(`Kode: *${c.code}*`);
  if (c.expires_at) {
    const d = new Date(c.expires_at);
    lines.push(
      `Berlaku s/d: ${d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    );
  }
  if (c.min_spend) {
    lines.push(`Min. belanja: Rp ${c.min_spend.toLocaleString("id-ID")}`);
  }
  lines.push("");
  lines.push(`Detail: ${url}`);
  lines.push("");
  lines.push("📌 via SuperKupon");
  return lines.join("\n");
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="17" />
      <line x1="14" y1="20" x2="17" y2="20" />
      <line x1="20" y1="14" x2="20" y2="14" />
      <line x1="17" y1="17" x2="17" y2="17" />
      <line x1="20" y1="17" x2="20" y2="20" />
    </svg>
  );
}
