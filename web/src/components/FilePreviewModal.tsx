"use client";

import { useEffect, useState } from "react";

import { getSupabase, STORAGE_BUCKET, type ProjectFileRow } from "@/lib/supabase";
import {
  formatBytes,
  MAX_TEXT_PREVIEW_BYTES,
  previewKind,
  type PreviewKind,
} from "@/lib/file-preview";

interface Props {
  file: ProjectFileRow | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: Props) {
  const sb = getSupabase();
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTextContent(null);

    (async () => {
      if (!sb) {
        setError("Supabase belum dikonfigurasi");
        setLoading(false);
        return;
      }
      try {
        const { data, error: signErr } = await sb.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(file.storage_path, 60 * 10);
        if (signErr || !data?.signedUrl) throw signErr ?? new Error("URL gak ke-generate");
        if (cancelled) return;
        setUrl(data.signedUrl);

        const kind = previewKind(file.mime_type, file.name);
        if (kind === "text" || kind === "code") {
          if (file.size_bytes > MAX_TEXT_PREVIEW_BYTES) {
            setError(`File terlalu besar untuk preview text (>${(MAX_TEXT_PREVIEW_BYTES / 1024) | 0}KB). Download untuk lihat.`);
            setLoading(false);
            return;
          }
          const res = await fetch(data.signedUrl);
          if (!res.ok) throw new Error(`Fetch gagal: HTTP ${res.status}`);
          const txt = await res.text();
          if (!cancelled) setTextContent(txt);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Preview gagal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, sb]);

  // Esc to close
  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file) return null;
  const kind = previewKind(file.mime_type, file.name);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Tutup preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-700 bg-gray-950/50 px-4 py-3">
          <span className="text-2xl flex-none">{KIND_EMOJI[kind]}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-white">{file.name}</h2>
            <p className="text-[10px] text-gray-400">
              {formatBytes(file.size_bytes)}
              {file.mime_type && <> · {file.mime_type}</>} ·{" "}
              <span className="rounded-full bg-violet-500/20 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                {kind}
              </span>
            </p>
          </div>
          {url && (
            <a
              href={url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-600"
            >
              ⬇ Download
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            ✕
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-950 to-gray-900 p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Loading preview...
            </div>
          ) : error ? (
            <ErrorState message={error} downloadUrl={url} fileName={file.name} />
          ) : !url ? (
            <ErrorState message="URL gak ke-generate" downloadUrl={null} fileName={file.name} />
          ) : (
            <Renderer kind={kind} url={url} textContent={textContent} fileName={file.name} mime={file.mime_type} />
          )}
        </div>

        <footer className="border-t border-gray-700 bg-gray-950/50 px-4 py-2 text-center text-[10px] text-gray-500">
          Tekan Esc atau klik di luar untuk tutup
        </footer>
      </div>
    </div>
  );
}

const KIND_EMOJI: Record<PreviewKind, string> = {
  image: "🖼",
  video: "🎬",
  audio: "🎵",
  pdf: "📕",
  text: "📄",
  code: "📋",
  other: "📦",
};

function Renderer({
  kind,
  url,
  textContent,
  fileName,
  mime,
}: {
  kind: PreviewKind;
  url: string;
  textContent: string | null;
  fileName: string;
  mime: string | null;
}) {
  if (kind === "image") {
    return (
      <div className="flex h-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-xl"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="flex h-full items-center justify-center">
        <video
          src={url}
          controls
          className="max-h-[70vh] max-w-full rounded-lg shadow-xl"
        >
          Browser lo gak support video tag.
        </video>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-7xl">🎵</div>
        <div className="font-semibold text-white">{fileName}</div>
        <audio src={url} controls className="w-full max-w-md">
          Browser lo gak support audio tag.
        </audio>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={fileName}
        className="h-[75vh] w-full rounded-lg border-0 bg-white"
      />
    );
  }

  if (kind === "text" || kind === "code") {
    return (
      <pre className="overflow-auto rounded-lg bg-black/60 p-4 font-mono text-xs leading-relaxed text-gray-100 max-h-[70vh]">
        <code>{textContent ?? "(empty)"}</code>
      </pre>
    );
  }

  // 'other' — no preview, show fallback
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="text-6xl">📦</div>
      <p className="text-base font-semibold text-white">{fileName}</p>
      <p className="text-xs text-gray-400">
        Preview gak tersedia untuk type {mime ?? "(unknown)"}.
      </p>
      <a
        href={url}
        download={fileName}
        className="mt-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600"
      >
        ⬇ Download untuk buka
      </a>
    </div>
  );
}

function ErrorState({
  message,
  downloadUrl,
  fileName,
}: {
  message: string;
  downloadUrl: string | null;
  fileName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="text-5xl">⚠️</div>
      <p className="text-sm font-semibold text-rose-300">{message}</p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={fileName}
          className="mt-2 rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600"
        >
          ⬇ Download anyway
        </a>
      )}
    </div>
  );
}
