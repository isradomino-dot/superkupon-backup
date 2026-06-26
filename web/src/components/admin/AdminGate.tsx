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
  getAdminRole,
  setAdminRole,
  clearAdminRole,
  loginAdmin,
  type AdminRole,
} from "@/lib/admin-api";

/**
 * Auth gate untuk admin pages.
 * Wrap content yang require admin auth — gak render isi sampai key validated.
 *
 * Flow:
 * 1. Cek localStorage untuk existing key
 * 2. Kalau ada → verify ke /admin/scrapers, kalau valid render children
 * 3. Kalau gak ada / invalid → tampilin login form (username + password)
 * 4. User input → POST /admin/login → simpan api_key + username + role di localStorage → render children
 *
 * Role-based:
 * - admin: full access, semua action enabled
 * - staff: read-only viewer, action buttons disabled/hidden via isAdminFullAccess()
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "needs-login" | "authenticated">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<AdminRole>("admin");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const existingKey = getAdminKey();
    if (!existingKey) {
      setStatus("needs-login");
      return;
    }

    verifyAdminKey(existingKey).then((valid) => {
      if (valid) {
        setCurrentUsername(getAdminUsername());
        setCurrentRole(getAdminRole());
        setStatus("authenticated");
      } else {
        clearAdminKey();
        clearAdminUsername();
        clearAdminRole();
        setStatus("needs-login");
        setError("Sesi habis. Silakan login lagi.");
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
      setAdminRole(result.role);
      setCurrentUsername(result.username);
      setCurrentRole(result.role);
      setShowSuccess(true);
      setTimeout(() => {
        setStatus("authenticated");
        setShowSuccess(false);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Coba lagi.");
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAdminKey();
    clearAdminUsername();
    clearAdminRole();
    setStatus("needs-login");
    setUsername("");
    setPassword("");
    setCurrentUsername(null);
    setCurrentRole("admin");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/50 to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-400" />
          <div className="text-sm text-gray-400">Memverifikasi akses...</div>
        </div>
      </div>
    );
  }

  if (status === "needs-login") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 px-4">
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -right-32 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-pink-500/20 blur-3xl" style={{ animationDelay: "1s" }} />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-amber-500/10 blur-3xl" style={{ animationDelay: "2s" }} />
        </div>

        {/* Login card */}
        <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl shadow-purple-500/10 backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/40 transition-transform hover:scale-110">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-3xl font-bold text-transparent">
              SuperKupon Admin
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Masuk untuk akses dashboard admin
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
            autoComplete="on"
            name="superkupon-admin-login"
          >
            <div className="group">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400 group-focus-within:text-purple-300"
              >
                Username
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400">
                  👤
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kangdedi"
                  autoFocus
                  autoComplete="username"
                  required
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-3 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400 group-focus-within:text-purple-300"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400">
                  🔑
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-3 py-3 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                💾 Browser akan auto-save credentials kamu setelah login pertama
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300 animate-pulse">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            {showSuccess && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                <span className="text-lg">✨</span>
                <span>Login berhasil! Membuka dashboard...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || submitting || showSuccess}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:shadow-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memverifikasi...
                  </>
                ) : showSuccess ? (
                  <>✨ Sukses!</>
                ) : (
                  <>
                    🚀 Masuk Dashboard
                  </>
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-pink-500 to-purple-500 transition-transform group-hover:translate-x-0" />
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-purple-300"
            >
              ← Balik ke halaman utama
            </a>
          </div>

          <div className="text-center text-xs text-gray-600">
            Powered by SuperKupon · 🔒 Secured login
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — render children with role-aware badge + logout button
  const isAdmin = currentRole === "admin";
  return (
    <>
      {children}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        {currentUsername && (
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs backdrop-blur transition ${
              isAdmin
                ? "border-purple-400/30 bg-purple-500/10 text-purple-200"
                : "border-blue-400/30 bg-blue-500/10 text-blue-200"
            }`}
            title={isAdmin ? "Admin — full access" : "Staff — read-only mode"}
          >
            <span>{isAdmin ? "👑" : "👁️"}</span>
            <span className="font-medium">{currentUsername}</span>
            <span className="text-[10px] uppercase opacity-70">
              {isAdmin ? "Admin" : "Staff"}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-gray-900/80 px-3 py-1.5 text-xs text-gray-400 backdrop-blur transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
          title="Logout dari admin dashboard"
        >
          <span className="transition group-hover:rotate-12">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );
}
