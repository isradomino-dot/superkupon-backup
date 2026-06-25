"use client";

import { useEffect, useState } from "react";
import {
  getAdminKey,
  setAdminKey,
  verifyAdminKey,
  clearAdminKey,
  getAdminUsername,
  setAdminUsername,
  clearAdminUsername,
  loginAdmin,
} from "@/lib/admin-api";

/**
 * Auth gate untuk admin pages.
 * Wrap content yang require admin auth — gak render isi sampai key validated.
 *
 * Flow:
 * 1. Cek localStorage untuk existing key
 * 2. Kalau ada → verify ke /admin/scrapers, kalau valid render children
 * 3. Kalau gak ada / invalid → tampilin login form (username + password)
 * 4. User input username+password → POST /admin/login → simpan api_key di localStorage → render children
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "needs-login" | "authenticated">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const existingKey = getAdminKey();
    if (!existingKey) {
      setStatus("needs-login");
      return;
    }

    // Verify existing key
    verifyAdminKey(existingKey).then((valid) => {
      if (valid) {
        setCurrentUsername(getAdminUsername());
        setStatus("authenticated");
      } else {
        clearAdminKey();
        clearAdminUsername();
        setStatus("needs-login");
        setError("Session expired. Login lagi.");
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await loginAdmin(username.trim(), password);
      setAdminKey(result.api_key);
      setAdminUsername(result.username);
      setCurrentUsername(result.username);
      setStatus("authenticated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAdminKey();
    clearAdminUsername();
    setStatus("needs-login");
    setUsername("");
    setPassword("");
    setCurrentUsername(null);
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
              Masukkan username + password buat akses dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-200"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kangdedi"
                autoFocus
                autoComplete="username"
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "Login..." : "Masuk"}
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

  // Authenticated — render children with logout button + username badge
  return (
    <>
      {children}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        {currentUsername && (
          <span className="rounded-lg border border-white/10 bg-gray-900/80 px-3 py-1.5 text-xs text-gray-300 backdrop-blur">
            👤 {currentUsername}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-white/10 bg-gray-900/80 px-3 py-1.5 text-xs text-gray-400 backdrop-blur transition hover:border-red-400/30 hover:text-red-300"
          title="Logout dari admin dashboard"
        >
          🚪 Logout
        </button>
      </div>
    </>
  );
}
