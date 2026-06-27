"use client";

import { useEffect, useState } from "react";
import {
  cancelPasswordReset,
  fetchPasswordResets,
  type PasswordResetRequest,
} from "@/lib/admin-api";

/**
 * Admin section: list pending password reset requests.
 *
 * Flow:
 * 1. User klik "Lupa password?" di public site
 * 2. Token muncul di sini
 * 3. Admin (kangdedi) liat → klik "Copy Token" → share ke user via WhatsApp
 * 4. User paste token di /reset/{token} → password baru
 *
 * Cocok untuk MVP (first ~100 members). Skala lebih besar: tambah Resend
 * email automation supaya gak manual lagi.
 */
export function PasswordResetTable() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPasswordResets(false);
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh tiap 30 detik untuk catch new requests
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyResetLink = async (token: string) => {
    const url = `${window.location.origin}/reset/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCancel = async (resetId: number, username: string) => {
    if (!confirm(`Cancel request reset untuk ${username}? User harus request lagi.`))
      return;
    try {
      await cancelPasswordReset(resetId);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Loading password reset requests...
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-200">
          🔑 Password Reset Requests ({requests.length} pending)
        </h3>
        <button
          onClick={loadData}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-300"
        >
          🔄 Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          ✨ Tidak ada permintaan reset password pending.
          <br />
          <span className="text-xs">
            User yang klik &ldquo;Lupa password?&rdquo; akan muncul di sini.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                  User
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                  Diminta
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">
                  Expire
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map((r) => {
                const isExpiringSoon = r.minutes_remaining < 15;
                return (
                  <tr key={r.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-200">{r.username}</div>
                      <div className="text-xs text-gray-500">ID #{r.user_id}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-300">
                      {r.email_at_request}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span
                        className={
                          isExpiringSoon ? "text-amber-300" : "text-emerald-300"
                        }
                      >
                        {r.minutes_remaining}m lagi
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyResetLink(r.token)}
                          className="rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[11px] font-medium text-purple-200 transition hover:bg-purple-500/20"
                          title="Copy link reset — share ke user via WhatsApp"
                        >
                          {copiedToken === r.token ? "✓ Copied" : "📋 Copy Link"}
                        </button>
                        <button
                          onClick={() => handleCancel(r.id, r.username)}
                          className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:bg-red-500/20"
                          title="Cancel request"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-500">
        💡 Cara handle: klik <strong className="text-purple-300">📋 Copy Link</strong>{" "}
        → share ke user via WhatsApp → user paste di browser → set password baru.
        Token valid 1 jam.
      </div>
    </div>
  );
}
