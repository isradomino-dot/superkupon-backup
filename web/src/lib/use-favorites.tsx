"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "dk_favorites_v2";
const FOLDERS_KEY = "dk_fav_folders_v1";
const DEFAULT_FOLDER = "default";

export interface FavRecord {
  id: number;
  savedAt: number;
  folder: string;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: "default", name: "Semua", emoji: "📌", createdAt: 0 },
];

const SUGGESTED_FOLDERS: Folder[] = [
  { id: "liburan", name: "Liburan", emoji: "🏖️", createdAt: 0 },
  { id: "belanja-bulanan", name: "Belanja Bulanan", emoji: "🛒", createdAt: 0 },
  { id: "weekend", name: "Weekend", emoji: "🍕", createdAt: 0 },
];

interface FavContextValue {
  records: FavRecord[];
  folders: Folder[];
  ids: number[];
  count: number;
  isFavorite: (id: number) => boolean;
  getFolder: (id: number) => string | undefined;
  toggle: (id: number, folder?: string) => boolean;
  add: (id: number, folder?: string) => void;
  remove: (id: number) => void;
  moveTo: (id: number, folder: string) => void;
  clear: () => void;
  addFolder: (name: string, emoji?: string) => Folder;
  removeFolder: (folderId: string) => void;
  recordsInFolder: (folderId: string) => FavRecord[];
  suggestedFolders: Folder[];
}

const FavContext = createContext<FavContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<FavRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawR = localStorage.getItem(STORAGE_KEY);
      if (rawR) {
        const parsed = JSON.parse(rawR);
        if (Array.isArray(parsed)) {
          const normalized: FavRecord[] = parsed.map((x) =>
            typeof x === "number"
              ? { id: x, savedAt: Date.now(), folder: DEFAULT_FOLDER }
              : {
                  id: Number(x.id),
                  savedAt: Number(x.savedAt) || Date.now(),
                  folder: typeof x.folder === "string" ? x.folder : DEFAULT_FOLDER,
                }
          );
          setRecords(normalized.filter((r) => Number.isFinite(r.id)));
        }
      } else {
        // Migrate from v1
        const legacy = localStorage.getItem("dk_favorites_v1");
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed)) {
            setRecords(
              parsed.map((x) => ({
                id: typeof x === "number" ? x : Number(x.id),
                savedAt: typeof x === "number" ? Date.now() : Number(x.savedAt) || Date.now(),
                folder: DEFAULT_FOLDER,
              }))
            );
          }
        }
      }

      const rawF = localStorage.getItem(FOLDERS_KEY);
      if (rawF) {
        const parsed = JSON.parse(rawF);
        if (Array.isArray(parsed)) {
          setFolders([
            ...DEFAULT_FOLDERS,
            ...parsed.filter((f) => f.id && f.name && f.id !== DEFAULT_FOLDER),
          ]);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      /* ignore */
    }
  }, [records, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const customFolders = folders.filter((f) => f.id !== DEFAULT_FOLDER);
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(customFolders));
    } catch {
      /* ignore */
    }
  }, [folders, hydrated]);

  const ids = useMemo(() => records.map((r) => r.id), [records]);
  const idSet = useMemo(() => new Set(ids), [ids]);
  const recordMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  const isFavorite = useCallback((id: number) => idSet.has(id), [idSet]);
  const getFolder = useCallback((id: number) => recordMap.get(id)?.folder, [recordMap]);

  const add = useCallback((id: number, folder = DEFAULT_FOLDER) => {
    setRecords((prev) => {
      if (prev.some((r) => r.id === id)) return prev;
      return [{ id, savedAt: Date.now(), folder }, ...prev];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const moveTo = useCallback((id: number, folder: string) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, folder } : r)));
  }, []);

  const toggle = useCallback(
    (id: number, folder = DEFAULT_FOLDER): boolean => {
      if (idSet.has(id)) {
        remove(id);
        return false;
      }
      add(id, folder);
      return true;
    },
    [idSet, add, remove]
  );

  const clear = useCallback(() => setRecords([]), []);

  const addFolder = useCallback((name: string, emoji = "📁"): Folder => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `f${Date.now()}`;
    const f: Folder = { id, name, emoji, createdAt: Date.now() };
    setFolders((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, f];
    });
    return f;
  }, []);

  const removeFolder = useCallback((folderId: string) => {
    if (folderId === DEFAULT_FOLDER) return;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setRecords((prev) => prev.map((r) => (r.folder === folderId ? { ...r, folder: DEFAULT_FOLDER } : r)));
  }, []);

  const recordsInFolder = useCallback(
    (folderId: string) => records.filter((r) => r.folder === folderId),
    [records]
  );

  const value = useMemo<FavContextValue>(
    () => ({
      records,
      folders,
      ids,
      count: records.length,
      isFavorite,
      getFolder,
      toggle,
      add,
      remove,
      moveTo,
      clear,
      addFolder,
      removeFolder,
      recordsInFolder,
      suggestedFolders: SUGGESTED_FOLDERS.filter(
        (s) => !folders.some((f) => f.id === s.id)
      ),
    }),
    [
      records,
      folders,
      ids,
      isFavorite,
      getFolder,
      toggle,
      add,
      remove,
      moveTo,
      clear,
      addFolder,
      removeFolder,
      recordsInFolder,
    ]
  );

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites must be inside <FavoritesProvider>");
  return ctx;
}
