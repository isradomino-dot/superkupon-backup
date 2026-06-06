"use client";

import { useState } from "react";

import { useAuth } from "@/lib/use-auth";
import { SignInModal } from "@/components/SignInModal";

export function AuthButton() {
  const { user, loading, signOut, configured } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="h-7 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
        aria-label="Loading auth"
      />
    );
  }

  // Not configured — show muted hint button (clickable but explains)
  if (!configured) {
    return (
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
        title="Supabase belum dikonfigurasi — klik untuk info"
      >
        ⚠️ Auth
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow hover:bg-brand-600"
        >
          👤 Masuk
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-700 text-xs font-bold text-white shadow-md hover:ring-2 hover:ring-brand-400"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={user.email ?? "Account"}
      >
        {initial}
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Signed in
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">
                {user.email}
              </div>
            </div>
            <a
              href="/sync"
              className="block px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              ☁️ Sync ke Cloud
            </a>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              ↪ Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
