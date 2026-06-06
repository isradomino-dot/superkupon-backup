"use client";

import { useState } from "react";

import type { Merchant } from "@/lib/types";

interface Props {
  merchant: Pick<Merchant, "name" | "website" | "slug">;
  /** Display size in pixels. Will request 2× for retina sharpness. */
  size?: number;
  className?: string;
  rounded?: "sm" | "md" | "full";
}

/**
 * Extracts hostname from merchant.website. Returns null if invalid.
 */
function getDomain(website?: string | null): string | null {
  if (!website) return null;
  try {
    const u = new URL(website);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Builds a Google s2 favicon URL — universal, free, decent quality for 16-64px.
 */
function googleFaviconUrl(domain: string, size: number): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/**
 * Deterministic background color per merchant slug — keeps visual consistency.
 */
const PALETTE = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-500",
  "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500",
  "bg-violet-500", "bg-fuchsia-500", "bg-pink-500", "bg-cyan-500",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function MerchantLogo({ merchant, size = 24, className = "", rounded = "md" }: Props) {
  const [errored, setErrored] = useState(false);
  const domain = getDomain(merchant.website);
  const url = domain ? googleFaviconUrl(domain, size * 2) : null;

  const roundedClass =
    rounded === "full" ? "rounded-full" : rounded === "sm" ? "rounded" : "rounded-md";

  if (errored || !url) {
    return (
      <span
        className={[
          "inline-flex flex-none items-center justify-center font-bold text-white",
          roundedClass,
          colorFor(merchant.slug || merchant.name),
          className,
        ].join(" ")}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.42) }}
        aria-label={merchant.name}
        title={merchant.name}
      >
        {initialOf(merchant.name)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={merchant.name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className={["flex-none object-contain bg-white", roundedClass, className].join(" ")}
    />
  );
}
