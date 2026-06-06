"use client";

import Link from "next/link";

import { useFavorites } from "@/lib/use-favorites";

export function FavoritesLink() {
  const { count } = useFavorites();

  return (
    <Link
      href="/favorites"
      aria-label="Kupon favorit"
      title={count > 0 ? `${count} kupon favorit` : "Kupon favorit"}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-300 transition hover:bg-white/10 hover:text-rose-300"
    >
      <HeartIcon filled={count > 0} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
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
