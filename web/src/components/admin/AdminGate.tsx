"use client";

import { useEffect, useState } from "react";
import { getAdminKey, setAdminKey, verifyAdminKey, clearAdminKey } from "@/lib/admin-api";

/**
 * Auth gate untuk admin pages.
 * Wrap content yang require admin auth — gak render isi sampai key validated.
 *
 * Flow:
 * 1. Cek localStorage untuk existing key
 * 2. Kalau ada → verify ke /admin/scrapers, kalau valid render children
 * 3. Kalau gak ada / invalid → tampilin login form
 * 4. User input key → verify → simpan ke localStorage → render children
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "needs-login" | "authenticated">("loading");
  const [inputKey, setInputKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existingKey = getAdminKey();
    if (!existingKey) {
      setStatus("needs-login");
      return;
    }

    // Verify existing key
    verifyAdminKey(existingKey).then((valid) => {
      if (valid) {
        setStatus("authenticated");
      } else {
        clearAdminKey();
        setStatus("needs-login");
        setError("Saved key invalid. Login lagi.");
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setSubmitting(true);
    setError(null);

    const valid = await verifyAdminKey(inputKey.trim());
    if (valid) {
      setAdminKey(inputKey.trim());
      setStatus("authenticated");
    } else {
      setError("API key salah. Cek ulang ADMIN_API_KEY di Railway env.");
    }
    setSubmitting(false);
  };

  const handleLogout = () => {
    clearAdminKey();
    setStatus("needs-login");
    setInputKey("");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Memverifikasi access...</div>
      </div>
    );
  }

  if (status === "needs-login") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-gray-900/80 p-8 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto mb-4 inline-block rounded-full bg-brand-500/20 p-3">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Login</h1>
            <p className="mt-2 text-sm text-gray-400">
              Masukkan ADMIN_API_KEY buat akses dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="api-key"
                className="block text-sm font-medium text-gray-200"
              >
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="TOH_-mM858tjDmorSi..."
                autoFocus
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Stored di localStorage lokal browser ini. Logout kapan aja
                clearable.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!inputKey.trim() || submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "Memverifikasi..." : "Login"}
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 text-center">
            <a
              href="/"
              className="text-xs text-gray-400 hover:text-brand-300 hover:underline"
            >
              ← Balik ke halaman utama
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — render children with logout button injected
  return (
    <>
      {children}
      {/* Floating logout button — top right corner */}
      <button
        type="button"
        onClick={handleLogout}
        className="fixed right-4 top-4 z-50 rounded-lg border border-white/10 bg-gray-900/80 px-3 py-1.5 text-xs text-gray-400 backdrop-blur transition hover:border-red-400/30 hover:text-red-300"
        title="Logout dari admin dashboard"
      >
        🚪 Logout
      </button>
    </>
  );
}
