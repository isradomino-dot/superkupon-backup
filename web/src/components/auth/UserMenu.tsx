"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

/**
 * Header user menu — Login/Daftar button kalau guest, avatar + dropdown
 * kalau logged in.
 *
 * Pakai useAuth() context untuk shared state — modal di-render di AuthProvider.
 */
export function UserMenu() {
  const { user, openLogin, openRegister, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // BUGFIX UI confusion: HIDE member nav di /admin path.
  // User report: lihat tombol Login + Daftar di header pas udah login admin
  // → confused kira gak masuk. Padahal itu Member auth (terpisah dari Admin
  // auth yang udah login). Sembunyiin di /admin biar UI clean.
  // Plus di /reset (password reset page) juga hide — user lagi reset password,
  // gak butuh distraction tombol auth lain.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/reset")) {
    return null;
  }

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  if (!user) {
    // Guest: Login + Daftar buttons
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={openLogin}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white"
        >
          Login
        </button>
        <button
          onClick={openRegister}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-500/30 transition hover:shadow-lg hover:shadow-purple-500/50"
        >
          ✨ Daftar
        </button>
      </div>
    );
  }

  // Logged-in: avatar + dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="group flex items-center gap-2 rounded-xl border border-purple-400/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:border-purple-400/60 hover:shadow-purple-500/20"
        aria-label="User menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white shadow-inner">
          {user.username[0]?.toUpperCase() || "U"}
        </span>
        <span className="hidden sm:inline">{user.username}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-white/10 bg-gray-900/95 p-2 shadow-2xl shadow-purple-500/20 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
          {/* User info header */}
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-base font-bold text-white shadow">
                {user.username[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {user.username}
                </div>
                <div className="truncate text-xs text-gray-400">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-200">
                {user.role === "staff" ? "👁️ Staff" : "✨ Member"}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="mt-2 space-y-0.5">
            <MenuItem
              icon="👤"
              label="Profil & Stats"
              onClick={() => {
                window.location.href = "/profile";
                setDropdownOpen(false);
              }}
            />
            <MenuItem
              icon="❤️"
              label="Kupon Favorit"
              onClick={() => {
                window.location.href = "/favorit";
                setDropdownOpen(false);
              }}
            />
            <MenuItem
              icon="📊"
              label="Statistik Publik"
              onClick={() => {
                window.location.href = "/statistik";
                setDropdownOpen(false);
              }}
            />
          </div>

          <div className="my-1.5 border-t border-white/10" />

          <button
            onClick={() => {
              setDropdownOpen(false);
              void logout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <span>🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
