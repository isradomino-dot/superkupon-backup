"use client";

import { useState } from "react";

import type { Coupon } from "@/lib/types";
import { useFavorites, type Folder } from "@/lib/use-favorites";

interface Props {
  selected: Coupon[];
  folders: Folder[];
  onClearSelection: () => void;
  onExitSelectMode: () => void;
}

function downloadJson(coupons: Coupon[]) {
  const blob = new Blob([JSON.stringify(coupons, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `favorit-selected-${coupons.length}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(coupons: Coupon[]) {
  const header = [
    "id",
    "merchant",
    "title",
    "code",
    "discount_type",
    "discount_value",
    "min_spend",
    "max_discount",
    "expires_at",
    "quality_score",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = coupons.map((c) =>
    [
      c.id,
      c.merchant.name,
      c.title,
      c.code ?? "",
      c.discount_type,
      c.discount_value,
      c.min_spend ?? "",
      c.max_discount ?? "",
      c.expires_at ?? "",
      c.quality_score,
    ]
      .map(escape)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `favorit-selected-${coupons.length}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BulkActionsBar({ selected, folders, onClearSelection, onExitSelectMode }: Props) {
  const { moveTo, remove } = useFavorites();
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (selected.length === 0) return null;

  const handleMoveTo = (folderId: string) => {
    for (const c of selected) {
      moveTo(c.id, folderId);
    }
    setShowFolderMenu(false);
    onClearSelection();
  };

  const handleDelete = () => {
    if (!window.confirm(`Hapus ${selected.length} kupon dari favorit?`)) return;
    for (const c of selected) {
      remove(c.id);
    }
    onClearSelection();
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] w-full max-w-3xl -translate-x-1/2 px-4 animate-slide-up">
      <div className="overflow-hidden rounded-2xl border border-rose-400/30 bg-gradient-to-br from-slate-900 via-rose-900/30 to-slate-900 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex flex-1 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white">
              {selected.length}
            </span>
            <span className="text-xs font-bold text-white">
              {selected.length} kupon dipilih
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[10px] font-semibold text-gray-400 hover:underline"
            >
              Clear pick
            </button>
          </div>

          {/* Move to folder */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFolderMenu((v) => !v);
                setShowExportMenu(false);
              }}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10"
            >
              📁 Pindah folder
            </button>
            {showFolderMenu && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-1 min-w-[160px] overflow-hidden rounded-md border border-gray-700 bg-gray-900 shadow-xl"
              >
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleMoveTo(f.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-rose-500/15"
                  >
                    <span aria-hidden>{f.emoji}</span>
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu((v) => !v);
                setShowFolderMenu(false);
              }}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10"
            >
              ⬇ Export ({selected.length})
            </button>
            {showExportMenu && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-1 min-w-[160px] overflow-hidden rounded-md border border-gray-700 bg-gray-900 shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    downloadJson(selected);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-brand-500/15"
                >
                  📄 Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCsv(selected);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-emerald-500/15"
                >
                  📊 Export CSV (Excel)
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-600"
          >
            🗑 Hapus
          </button>

          {/* Exit select mode */}
          <button
            type="button"
            onClick={onExitSelectMode}
            className="rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5"
            title="Keluar dari mode pilih"
          >
            ✕ Done
          </button>
        </div>
      </div>
    </div>
  );
}
