"use client";

import { useEffect, useState } from "react";

import { useCollaborators } from "@/lib/use-collaborators";
import type { CollaboratorRole, InvitationRow } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function InviteModal({ open, onClose, projectId, projectName }: Props) {
  const { inviteByEmail } = useCollaborators(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<InvitationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("viewer");
    setCreated(null);
    setError(null);
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    const result = await inviteByEmail(email, role);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.invitation) setCreated(result.invitation);
  };

  const inviteUrl =
    created && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${created.invitation_token}`
      : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-slide-up dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              👥 Invite Collaborator
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-gray-500 hover:text-rose-500"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            ke project: <span className="font-semibold">{projectName}</span>
          </p>
        </div>

        {created ? (
          <div className="space-y-4 p-6">
            <div className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300">
              ✓ Invitation dibuat untuk{" "}
              <strong>{created.invited_email}</strong> sebagai{" "}
              <strong>{created.role}</strong>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Invitation Link
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={[
                    "rounded-md px-3 py-2 text-xs font-bold shadow transition",
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-brand-500 text-white hover:bg-brand-600",
                  ].join(" ")}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">
                💡 Share link ini ke <strong>{created.invited_email}</strong> via WhatsApp /
                email / chat. Mereka klik link → sign in dengan email yang sama → accept.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreated(null);
                  setEmail("");
                  setError(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                + Invite lagi
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Email collaborator
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teman@email.com"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>

            <fieldset>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Role</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <RoleCard
                  role="viewer"
                  active={role === "viewer"}
                  onClick={() => setRole("viewer")}
                  emoji="👁"
                  label="Viewer"
                  description="Read-only: lihat project, tags, files, activity"
                />
                <RoleCard
                  role="editor"
                  active={role === "editor"}
                  onClick={() => setRole("editor")}
                  emoji="✏️"
                  label="Editor"
                  description="Read + write: edit project, tags, upload files"
                />
              </div>
            </fieldset>

            {error && (
              <div className="rounded-md bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                ✗ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating..." : "📤 Generate Invitation Link"}
            </button>

            <p className="text-center text-[10px] text-gray-500">
              Email NOT auto-sent — lo copy link manual & share via channel pilihan
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  active,
  onClick,
  emoji,
  label,
  description,
}: {
  role: CollaboratorRole;
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border-2 p-3 text-left transition",
        active
          ? "border-brand-500 bg-brand-500/10"
          : "border-gray-300 hover:border-brand-400 dark:border-gray-600",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xl" aria-hidden>{emoji}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
      </div>
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}
