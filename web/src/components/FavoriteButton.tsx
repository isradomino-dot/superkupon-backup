"use client";

import { useState } from "react";

import { useFavorites } from "@/lib/use-favorites";
import { fireConfetti } from "@/lib/confetti";
import { trackFavorite } from "@/lib/analytics";

const HEART_COLORS = ["#fb7185", "#f43f5e", "#ec4899", "#a78bfa", "#facc15"];

interface Props {
  couponId: number;
  size?: "sm" | "md";
}

export function FavoriteButton({ couponId, size = "sm" }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(couponId);
  const [bouncing, setBouncing] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasFav = fav;
    toggle(couponId);
    trackFavorite(couponId, wasFav ? "remove" : "add");
    setBouncing(true);
    setTimeout(() => setBouncing(false), 350);
    if (!wasFav) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti({
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        particleCount: 35,
        colors: HEART_COLORS,
        spread: 110,
        startVelocity: 10,
        ticks: 90,
      });
    }
  };

  const sizes = {
    sm: { btn: "h-8 w-8", icon: 16 },
    md: { btn: "h-10 w-10", icon: 20 },
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
      aria-pressed={fav}
      title={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
      className={[
        "inline-flex items-center justify-center rounded-full transition-all",
        sizes.btn,
        fav
          ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-rose-300",
        bouncing && "scale-125",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <HeartIcon size={sizes.icon} filled={fav} />
    </button>
  );
}

function HeartIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
