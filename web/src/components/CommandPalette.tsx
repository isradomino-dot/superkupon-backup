"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAutocomplete, isAbortError, type AutocompleteResponse } from "@/lib/api";

interface NavAction {
  kind: "nav";
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  href: string;
  keywords?: string[];
}

interface ToggleAction {
  kind: "toggle";
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  run: () => void;
  keywords?: string[];
}

type Action = NavAction | ToggleAction;

interface FlatItem {
  section: "Actions" | "Merchants" | "Categories" | "Coupons";
  id: string;
  emoji: string;
  label: string;
  sublabel?: string;
  onSelect: () => void;
}

const RECENT_KEY = "sk_cmdk_recent_v1";
const MAX_RECENT = 5;

function toggleTheme() {
  if (typeof document === "undefined") return;
  const isDark = document.documentElement.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("kh_theme", next);
  } catch {
    /* ignore */
  }
}

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

/**
 * Global Cmd+K command palette.
 * Mount once near root (layout). Listens for ⌘+K / Ctrl+K from anywhere.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  // Static actions
  const actions = useMemo<Action[]>(
    () => [
      { kind: "nav", id: "home", emoji: "🏠", label: "Beranda", sublabel: "Halaman utama", href: "/", keywords: ["home"] },
      { kind: "nav", id: "favorites", emoji: "♥", label: "Favorit", sublabel: "Kupon yang lo simpan", href: "/favorites", keywords: ["favorite", "saved"] },
      { kind: "nav", id: "history", emoji: "🕒", label: "History", sublabel: "Kupon yang lo salin", href: "/history", keywords: ["claim", "claimed"] },
      { kind: "nav", id: "map", emoji: "🗺", label: "Map View", sublabel: "Merchant di peta", href: "/map", keywords: ["peta", "lokasi"] },
      { kind: "nav", id: "dashboard", emoji: "📊", label: "Dashboard", sublabel: "Projects & sync", href: "/dashboard", keywords: ["projects"] },
      { kind: "nav", id: "projects", emoji: "📁", label: "Projects", sublabel: "Project manager", href: "/dashboard/projects", keywords: ["project"] },
      { kind: "nav", id: "sync", emoji: "☁️", label: "Cloud Sync", sublabel: "Push/pull data ke Supabase", href: "/sync", keywords: ["backup", "cloud"] },
      { kind: "nav", id: "mockup", emoji: "🎨", label: "Design Lab", sublabel: "Interactive UI mockup", href: "/mockup", keywords: ["design", "preview"] },
      {
        kind: "toggle",
        id: "theme",
        emoji: "🌗",
        label: "Toggle Theme",
        sublabel: "Switch Dark ↔ Light mode",
        run: toggleTheme,
        keywords: ["dark", "light", "mode"],
      },
    ],
    [],
  );

  // Hydrate recent on open
  useEffect(() => {
    if (open) setRecentIds(loadRecent());
  }, [open]);

  // Global keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K (mac) or Ctrl+K (win/linux) — toggle
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // Forward-slash "/" — also opens (popular shortcut)
      if (e.key === "/" && !open) {
        const target = e.target as HTMLElement | null;
        // Don't trigger if user is typing in an input/textarea
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        if (target?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Auto-focus input + reset state when opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSuggestions(null);
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Debounced autocomplete
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    ctrlRef.current?.abort();

    if (trimmed.length < 2) {
      setSuggestions(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getAutocomplete(trimmed, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setSuggestions(res);
      } catch (e) {
        if (!isAbortError(e)) setSuggestions(null);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Build flat items list (actions filtered + autocomplete sections)
  const items = useMemo<FlatItem[]>(() => {
    const q = query.trim().toLowerCase();
    const flat: FlatItem[] = [];

    // Filter actions by query keyword match
    const filteredActions = actions.filter((a) => {
      if (!q) return true;
      const haystack = [a.label, a.sublabel, ...(a.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    for (const a of filteredActions) {
      flat.push({
        section: "Actions",
        id: a.id,
        emoji: a.emoji,
        label: a.label,
        sublabel: a.sublabel,
        onSelect: () => {
          if (a.kind === "nav") {
            router.push(a.href);
            setOpen(false);
          } else {
            a.run();
            // don't close for toggles — let user see the change
          }
          // Track as recent
          const next = [a.id, ...recentIds.filter((x) => x !== a.id)].slice(0, MAX_RECENT);
          setRecentIds(next);
          saveRecent(next);
        },
      });
    }

    if (suggestions) {
      for (const m of suggestions.merchants) {
        flat.push({
          section: "Merchants",
          id: `m-${m.slug}`,
          emoji: "🛍",
          label: m.name,
          sublabel: `${m.count} kupon · merchant`,
          onSelect: () => {
            router.push(`/merchant/${m.slug}`);
            setOpen(false);
          },
        });
      }
      for (const c of suggestions.categories) {
        flat.push({
          section: "Categories",
          id: `c-${c.slug}`,
          emoji: "📂",
          label: c.name,
          sublabel: `${c.count} kupon · kategori`,
          onSelect: () => {
            router.push(`/category/${c.slug}`);
            setOpen(false);
          },
        });
      }
      for (const c of suggestions.codes) {
        flat.push({
          section: "Coupons",
          id: `coupon-${c.id}`,
          emoji: "🎟",
          label: c.code ?? "(no code)",
          sublabel: `${c.merchant_name ?? ""} · ${c.title.slice(0, 60)}`,
          onSelect: () => {
            router.push(`/coupon/${c.id}`);
            setOpen(false);
          },
        });
      }
      // Free-text search fallback
      if (suggestions.query && filteredActions.length === 0) {
        flat.push({
          section: "Coupons",
          id: `search-${suggestions.query}`,
          emoji: "🔎",
          label: `Cari "${suggestions.query}"`,
          sublabel: "Cari di semua kupon",
          onSelect: () => {
            router.push(`/?q=${encodeURIComponent(suggestions.query)}`);
            setOpen(false);
          },
        });
      }
    }

    return flat;
  }, [actions, suggestions, query, router, recentIds]);

  // Reset activeIdx when items change
  useEffect(() => {
    setActiveIdx(0);
  }, [items.length, query]);

  // Keyboard nav within modal
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (items.length === 0 ? 0 : i <= 0 ? items.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = items[activeIdx];
        if (sel) sel.onSelect();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [items, activeIdx],
  );

  if (!open) return null;

  // Group items for section headers
  const grouped = groupBySection(items);

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center px-4 pt-[10vh] animate-fade-in">
      <button
        type="button"
        aria-label="Tutup command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-700 px-4 py-3">
          <span className="text-gray-500" aria-hidden>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Cari merchant, kode kupon, atau action..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
          />
          {loading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          )}
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        <div role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {items.length === 0 ? (
            <EmptyState query={query} loading={loading} />
          ) : (
            grouped.map(({ section, items: sectionItems, startIdx }) => (
              <div key={section}>
                <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                  {section}
                </div>
                {sectionItems.map((item, i) => {
                  const idx = startIdx + i;
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={[
                        "flex w-full items-start gap-3 px-3 py-2 text-left transition",
                        active ? "bg-brand-500/20" : "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <span className="flex-none text-lg" aria-hidden>{item.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-100">
                          {item.label}
                        </div>
                        {item.sublabel && (
                          <div className="truncate text-[11px] text-gray-400">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                      {active && (
                        <span className="flex-none text-gray-400">
                          <Kbd>↵</Kbd>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-700 bg-gray-950/50 px-4 py-2 text-[10px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd>
              close
            </span>
          </div>
          <div className="text-gray-500">
            {items.length > 0 && `${items.length} result${items.length > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ query, loading }: { query: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="px-3 py-8 text-center text-xs text-gray-500">Searching…</div>
    );
  }
  if (query.trim().length >= 2) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="text-3xl">🔍</div>
        <p className="mt-2 text-sm text-gray-400">
          Gak ada yang cocok untuk &ldquo;{query}&rdquo;
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          Coba kata kunci lain atau action di bawah
        </p>
      </div>
    );
  }
  return (
    <div className="px-3 py-8 text-center">
      <div className="text-3xl">⌨️</div>
      <p className="mt-2 text-sm text-gray-400">Ketik untuk cari merchant, kode kupon, atau action</p>
      <p className="mt-1 text-[11px] text-gray-500">↑↓ navigasi · ↵ pilih · esc tutup</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-600 bg-gray-800 px-1.5 font-sans text-[10px] font-semibold text-gray-300 shadow-sm">
      {children}
    </kbd>
  );
}

function groupBySection(items: FlatItem[]): {
  section: FlatItem["section"];
  items: FlatItem[];
  startIdx: number;
}[] {
  const result: { section: FlatItem["section"]; items: FlatItem[]; startIdx: number }[] = [];
  let cursor = 0;
  for (const item of items) {
    const last = result[result.length - 1];
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      result.push({ section: item.section, items: [item], startIdx: cursor });
    }
    cursor++;
  }
  return result;
}
