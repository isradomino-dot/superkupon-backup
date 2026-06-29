"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminResetMemberPassword,
  fetchMembers,
  isAdminFullAccess,
  type AdminMember,
} from "@/lib/admin-api";

/**
 * Admin section: list semua member terdaftar + reset password manual.
 *
 * Flow reset password (admin-mediated, no email automation di MVP):
 * 1. Admin klik "🔑 Reset Password" di row member
 * 2. Modal kebuka — admin ketik password baru (min 6 char)
 * 3. Submit → POST /admin/users/{id}/reset-password
 * 4. Sukses → tampilin password baru (copyable) + instruksi share via WA
 * 5. Admin copy → kirim ke member via WhatsApp
 *
 * Untuk staff role: tombol reset di-disable (read-only).
 */
export function MembersTable() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetModalUser, setResetModalUser] = useState<AdminMember | null>(null);
  const [search, setSearch] = useState("");
  const [isFullAccess, setIsFullAccess] = useState(false);

  useEffect(() => {
    setIsFullAccess(isAdminFullAccess());
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [members, search]);

  if (loading && members.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Loading members...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        ❌ {error}
        <button
          onClick={loadData}
          className="ml-3 underline hover:text-red-200"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-200">
            👥 Members ({members.length} total)
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari username/email..."
              className="rounded-md border border-white/10 bg-gray-800/50 px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/30"
            />
            <button
              onClick={loadData}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-300"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            {search.trim()
              ? `Gak ada member yang cocok dengan "${search}".`
              : "Belum ada member terdaftar."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5 text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Username
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Joined
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Last Login
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-400">
                    Claims
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((m) => {
                  const roleColor =
                    m.role === "admin"
                      ? "border-purple-400/30 bg-purple-500/10 text-purple-200"
                      : m.role === "staff"
                        ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
                        : "border-gray-400/30 bg-gray-500/10 text-gray-300";
                  const statusColor =
                    m.status === "active"
                      ? "text-emerald-300"
                      : m.status === "banned"
                        ? "text-red-300"
                        : "text-amber-300";
                  return (
                    <tr key={m.id} className="transition hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-200">
                          {m.username}
                        </div>
                        <div className="text-xs text-gray-500">ID #{m.id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">
                        {m.email}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase ${roleColor}`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-xs ${statusColor}`}>
                        {m.status}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {new Date(m.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {m.last_login_at
                          ? new Date(m.last_login_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-brand-300">
                        {m.claim_count}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isFullAccess ? (
                          <button
                            onClick={() => setResetModalUser(m)}
                            className="rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[11px] font-medium text-purple-200 transition hover:bg-purple-500/20"
                            title="Reset password member secara manual"
                          >
                            🔑 Reset Password
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Role staff read-only. Hubungi admin."
                            className="cursor-not-allowed rounded-md border border-white/10 bg-gray-800/40 px-2 py-1 text-[11px] text-gray-500 opacity-60"
                          >
                            🔒 Admin only
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-500">
          💡 Reset password manual: generate password baru → share ke member
          via WhatsApp. Member langsung bisa login pakai password baru.
        </div>
      </div>

      {resetModalUser && (
        <ResetPasswordModal
          member={resetModalUser}
          onClose={() => setResetModalUser(null)}
        />
      )}
    </>
  );
}

// ============================================================
// Reset Password Modal
// ============================================================

interface ResetPasswordModalProps {
  member: AdminMember;
  onClose: () => void;
}

function ResetPasswordModal({ member, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState(() => generateDefaultPassword());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isValid = newPassword.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminResetMemberPassword(
        member.id,
        newPassword.trim(),
      );
      setSuccessPassword(newPassword.trim());
      setSuccessMessage(result.message || "Password berhasil di-reset.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Reset gagal.";
      setError(humanizeError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!successPassword) return;
    try {
      await navigator.clipboard.writeText(successPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleRegenerate = () => {
    setNewPassword(generateDefaultPassword());
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-gray-900/95 p-6 shadow-2xl shadow-purple-500/20">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3 top-3 rounded-md p-1 text-gray-500 transition hover:bg-white/5 hover:text-gray-200 disabled:opacity-50"
          title="Tutup"
        >
          ✕
        </button>

        <div>
          <h3 className="text-lg font-bold text-white">
            🔑 Reset Password Member
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            User:{" "}
            <span className="font-semibold text-purple-300">
              {member.username}
            </span>{" "}
            ({member.email})
          </p>
        </div>

        {successPassword ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-emerald-200">
                ✅ Password baru berhasil di-set
              </div>
              {successMessage && (
                <div className="mt-1 text-xs text-emerald-100/70">
                  {successMessage}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password baru
              </label>
              <div className="mt-1.5 flex items-stretch gap-2">
                <code className="flex-1 select-all rounded-lg border border-white/10 bg-gray-800/70 px-3 py-2.5 font-mono text-sm text-amber-200">
                  {successPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-purple-400/30 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/30"
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90">
              <strong className="text-amber-200">📲 Next step:</strong> share
              password ini ke <strong>{member.username}</strong> via WhatsApp.
              Member langsung bisa login pakai password baru. Sarankan ganti
              password setelah login pertama.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                Password Baru
              </label>
              <div className="mt-1.5 flex items-stretch gap-2">
                <input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Min 6 karakter"
                  autoFocus
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-white/10 bg-gray-800/50 px-3 py-2.5 font-mono text-sm text-white placeholder-gray-500 transition focus:border-purple-400 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={submitting}
                  title="Generate password random"
                  className="rounded-lg border border-white/10 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200 disabled:opacity-50"
                >
                  🎲
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Min 6 karakter. Klik 🎲 untuk generate random aman.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? "⏳ Mengubah..." : "✅ Konfirmasi Reset"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Generate password random aman: 10 char, alphanumeric (no ambiguous).
 * Hindarin char yang gampang salah baca (0/O, 1/l/I) supaya admin gampang
 * share via WA tanpa typo.
 */
function generateDefaultPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(10);
    window.crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length; i++) {
      out += charset[buf[i] % charset.length];
    }
  } else {
    for (let i = 0; i < 10; i++) {
      out += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  return out;
}

/**
 * Convert raw error message ("API error 404: ...") ke human-readable Indonesian.
 */
function humanizeError(raw: string): string {
  if (/40[13]|forbidden|unauthor/i.test(raw)) {
    return "Akses ditolak. Pastikan kamu login sebagai admin (bukan staff).";
  }
  if (/404|not.*found/i.test(raw)) {
    return "Member tidak ditemukan. Mungkin sudah dihapus — refresh list.";
  }
  if (/5\d\d|server/i.test(raw)) {
    return "Server error. Coba lagi sebentar.";
  }
  return raw;
}
