"use client";

import { useEffect, useState } from "react";

import type { ProjectRow } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  project: ProjectRow;
  onToggleSharing: (isPublic: boolean) => Promise<void>;
}

export function ShareModal({ open, onClose, project, onToggleSharing }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/share/${project.share_token}`;

  const handleToggle = async () => {
    setBusy(true);
    await onToggleSharing(!project.is_public);
    setBusy(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
              🔗 Share Project
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-gray-500 hover:text-rose-500"
              aria-label="Tutup modal"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span aria-hidden>{project.emoji}</span> {project.name}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {project.is_public ? "🌐 Public" : "🔒 Private"}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {project.is_public
                  ? "Anyone with link bisa view (read-only)"
                  : "Cuma lo yang bisa view project ini"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={busy}
              role="switch"
              aria-checked={project.is_public}
              className={[
                "relative inline-flex h-7 w-12 flex-none items-center rounded-full transition",
                project.is_public ? "bg-emerald-500" : "bg-gray-500",
                busy ? "opacity-50" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                  project.is_public ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          {/* Share URL */}
          {project.is_public && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Share URL
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
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
              <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                💡 Share URL ini ke siapapun. Mereka gak perlu sign in untuk view.
                Mereka cuma bisa view (read-only) — gak bisa edit/delete.
              </p>
            </div>
          )}

          {/* Permissions explainer */}
          <div className="space-y-1.5 rounded-lg bg-violet-500/10 p-3 text-[11px] text-violet-200 dark:text-violet-300">
            <div className="font-bold text-violet-100 dark:text-violet-200">🛡 What's visible:</div>
            <ul className="list-inside list-disc space-y-0.5 text-violet-200/90">
              <li>Project name, description, tags</li>
              <li>Activity log (recent edits)</li>
              <li>File attachments (download links)</li>
              <li>URL field (kalau lo isi)</li>
            </ul>
            <div className="mt-2 font-bold text-rose-300">🚫 NOT visible:</div>
            <ul className="list-inside list-disc space-y-0.5 text-rose-300/90">
              <li>Email lo</li>
              <li>Project lain</li>
              <li>Account settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
