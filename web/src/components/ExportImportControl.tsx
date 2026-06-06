"use client";

import { useRef, useState } from "react";

import { useFavorites, type FavRecord, type Folder } from "@/lib/use-favorites";
import {
  useMerchantFollows,
  type FollowRecord,
} from "@/lib/use-merchant-follows";

const EXPORT_VERSION = 1;

interface ExportPayload {
  version: number;
  exportedAt: string;
  app: string;
  favorites: {
    records: FavRecord[];
    folders: Folder[];
  };
  merchantFollows: FollowRecord[];
}

interface ImportResult {
  kind: "ok" | "err";
  message: string;
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestampSlug(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function ExportImportControl() {
  const { records, folders, add, addFolder, count: favCount } = useFavorites();
  const { follows, follow, count: followCount } = useMerchantFollows();
  const [toast, setToast] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload: ExportPayload = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      app: "SuperKupon",
      favorites: {
        records,
        folders: folders.filter((f) => f.id !== "default"),
      },
      merchantFollows: follows,
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      `superkupon-backup-${timestampSlug()}.json`,
    );
    setToast({
      kind: "ok",
      message: `Exported: ${records.length} favorit, ${folders.length - 1} folder, ${follows.length} merchant follows`,
    });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object") {
        throw new Error("File JSON tidak valid");
      }
      if (typeof data.version !== "number" || data.version > EXPORT_VERSION) {
        throw new Error(
          `Versi backup tidak didukung (file v${data.version}, app v${EXPORT_VERSION})`,
        );
      }

      let importedFavs = 0;
      let importedFolders = 0;
      let importedFollows = 0;

      // 1. Folders first so favorites can reference them
      const importedFolderIds = new Set<string>();
      if (Array.isArray(data.favorites?.folders)) {
        for (const f of data.favorites.folders) {
          if (f && typeof f.name === "string" && f.id !== "default") {
            const exists = folders.some((existing) => existing.id === f.id);
            if (!exists) {
              const created = addFolder(f.name, f.emoji);
              importedFolderIds.add(created.id);
              importedFolders++;
            }
          }
        }
      }

      // 2. Favorite records (skip dupes by id)
      if (Array.isArray(data.favorites?.records)) {
        const existingIds = new Set(records.map((r) => r.id));
        for (const r of data.favorites.records) {
          if (r && typeof r.id === "number" && !existingIds.has(r.id)) {
            const folderToUse =
              r.folder && folders.some((f) => f.id === r.folder)
                ? r.folder
                : "default";
            add(r.id, folderToUse);
            importedFavs++;
          }
        }
      }

      // 3. Merchant follows
      if (Array.isArray(data.merchantFollows)) {
        const existingSlugs = new Set(follows.map((f) => f.slug));
        for (const m of data.merchantFollows) {
          if (
            m &&
            typeof m.slug === "string" &&
            typeof m.name === "string" &&
            !existingSlugs.has(m.slug)
          ) {
            follow(m.slug, m.name);
            importedFollows++;
          }
        }
      }

      setToast({
        kind: "ok",
        message: `Import sukses: +${importedFavs} favorit, +${importedFolders} folder, +${importedFollows} follows`,
      });
    } catch (e) {
      setToast({
        kind: "err",
        message: e instanceof Error ? e.message : "Gagal parse file",
      });
    } finally {
      setTimeout(() => setToast(null), 5000);
      // reset input so same file can be re-selected later
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
  };

  const isEmpty = favCount === 0 && followCount === 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span aria-hidden>💾</span> Backup & Restore
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Export semua favorit, folder, & merchant follows ke file JSON. Berguna
            untuk pindah perangkat atau backup.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={isEmpty}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          title={isEmpty ? "Belum ada data untuk di-export" : "Download backup .json"}
        >
          <span aria-hidden>⬇</span> Export ke JSON
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-emerald-400 hover:bg-emerald-500/10"
        >
          <span aria-hidden>⬆</span> Import dari JSON
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {!isEmpty && (
        <p className="mt-2 text-[10px] text-gray-500">
          Status: {favCount} favorit · {follows.length} merchant follows ·{" "}
          {folders.length - 1} custom folder
        </p>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={[
            "mt-3 rounded-md px-3 py-2 text-xs font-medium",
            toast.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300",
          ].join(" ")}
        >
          {toast.kind === "ok" ? "✓ " : "✗ "}
          {toast.message}
        </div>
      )}
    </div>
  );
}
