"use client";

import { useState } from "react";

import { TAG_COLOR_PALETTE, tagColorClasses, useProjectTags } from "@/lib/use-project-tags";
import type { TagDefRow } from "@/lib/supabase";

interface Props {
  projectId: string;
  onTagChange?: (action: "added" | "removed", tag: TagDefRow) => void;
}

export function TagPicker({ projectId, onTagChange }: Props) {
  const { allTags, attachTag, detachTag, createTag, tagsForProject, loading } = useProjectTags();
  const attached = tagsForProject(projectId);
  const attachedIds = new Set(attached.map((t) => t.id));
  const available = allTags.filter((t) => !attachedIds.has(t.id));

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("violet");
  const [showPicker, setShowPicker] = useState(false);

  const handleAttach = async (tag: TagDefRow) => {
    const ok = await attachTag(projectId, tag.id);
    if (ok) onTagChange?.("added", tag);
  };

  const handleDetach = async (tag: TagDefRow) => {
    const ok = await detachTag(projectId, tag.id);
    if (ok) onTagChange?.("removed", tag);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const created = await createTag(newName.trim(), newColor);
    setCreating(false);
    if (created) {
      await attachTag(projectId, created.id);
      onTagChange?.("added", created);
      setNewName("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {attached.map((tag) => (
          <span
            key={tag.id}
            className={[
              "group inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-[11px] font-medium",
              tagColorClasses(tag.color),
            ].join(" ")}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleDetach(tag)}
              aria-label={`Hapus tag ${tag.name}`}
              className="flex h-4 w-4 items-center justify-center rounded-full opacity-60 transition hover:bg-rose-500/30 hover:opacity-100"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-500 px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:border-brand-400 hover:text-brand-300"
        >
          {showPicker ? "✕ Tutup" : "+ Tag"}
        </button>
      </div>

      {showPicker && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          {available.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Pilih tag
              </div>
              <div className="flex flex-wrap gap-1.5">
                {available.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAttach(tag)}
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition hover:scale-105",
                      tagColorClasses(tag.color),
                    ].join(" ")}
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="mt-3 space-y-2 border-t border-gray-700 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Atau buat tag baru
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama tag..."
                maxLength={40}
                className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:border-brand-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-md bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow hover:bg-brand-600 disabled:opacity-50"
              >
                {creating ? "..." : "+ Buat"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {TAG_COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewColor(c.id)}
                  className={[
                    "rounded-full border px-2 py-0.5 text-[10px] transition",
                    c.classes,
                    newColor === c.id ? "ring-2 ring-white" : "opacity-70",
                  ].join(" ")}
                >
                  {c.id}
                </button>
              ))}
            </div>
          </form>

          {loading && (
            <div className="mt-2 text-center text-[10px] text-gray-500">Loading tags...</div>
          )}
        </div>
      )}
    </div>
  );
}
