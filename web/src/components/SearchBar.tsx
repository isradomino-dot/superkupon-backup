"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

import { useI18n } from "@/i18n/provider";
import { getAutocomplete, isAbortError, type AutocompleteResponse } from "@/lib/api";
import { useSearchHistory } from "@/lib/use-search-history";
import { SkeletonBar, SkeletonCircle } from "@/components/Skeleton";

/**
 * Search input + "Cari" button + autocomplete dropdown.
 *
 * Spec:
 *   - Type query → debounced suggestions dropdown:
 *     • Merchants matching (e.g., "tok" → Tokopedia)
 *     • Categories matching
 *     • Active coupon codes matching
 *   - Keyboard navigation: ↑/↓ to select, Enter to apply, Esc to close
 *   - Click suggestion → apply filter or open coupon detail
 */
export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<AutocompleteResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showingHistory = q.trim().length < 2 && history.length > 0;

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  // Close dropdown when click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced fetch — abort prior request when user types again or unmounts
  useEffect(() => {
    const trimmed = q.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 2) {
      setSuggestions(null);
      setLoadingSuggest(false);
      return;
    }
    setLoadingSuggest(true);
    const ctrl = new AbortController();
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getAutocomplete(trimmed, { signal: ctrl.signal });
        setSuggestions(res);
        setActiveIdx(-1);
      } catch (e) {
        if (!isAbortError(e)) setSuggestions(null);
      } finally {
        if (!ctrl.signal.aborted) setLoadingSuggest(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ctrl.abort();
    };
  }, [q]);

  const items = flattenSuggestions(suggestions);

  const submit = useCallback(
    (override?: { type: string; payload: string }) => {
      const search = new URLSearchParams(params.toString());
      search.delete("q");
      search.delete("merchant");
      search.delete("category");
      if (override) {
        if (override.type === "merchant") {
          router.push(`/merchant/${override.payload}`);
          setOpen(false);
          return;
        }
        if (override.type === "category") {
          router.push(`/category/${override.payload}`);
          setOpen(false);
          return;
        }
        if (override.type === "coupon") {
          router.push(`/coupon/${override.payload}`);
          setOpen(false);
          return;
        }
        if (override.type === "query") {
          search.set("q", override.payload);
          router.push(`/?${search.toString()}`);
          setOpen(false);
          return;
        }
      }
      if (q.trim()) {
        search.set("q", q.trim());
        addEntry(q.trim());
      }
      router.push(`/?${search.toString()}`);
      setOpen(false);
    },
    [params, q, router, addEntry]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < items.length) {
        e.preventDefault();
        const sel = items[activeIdx];
        submit({ type: sel.type, payload: sel.payload });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2"
        role="search"
      >
        <div className="relative w-full">
        <input
          type="search"
          inputMode="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          aria-autocomplete="list"
          aria-expanded={open}
          className="
            w-full rounded-lg border px-4 py-2 pr-12 text-sm shadow-sm
            border-gray-300 bg-white text-gray-900
            placeholder:text-[#555555]
            focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            dark:placeholder:text-[#CCCCCC]
          "
        />
        <VoiceSearchButton
          onResult={(text) => {
            setQ(text);
            setOpen(true);
          }}
        />
        </div>
        <button
          type="submit"
          className="
            flex-none rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition
            bg-brand-500 text-white hover:bg-brand-600
            dark:bg-brand-600 dark:hover:bg-brand-500
          "
        >
          {t("search.button")}
        </button>
      </form>

      {open && (showingHistory || items.length > 0 || loadingSuggest) && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-[#1e1b2e] py-1 text-gray-100 shadow-2xl"
        >
          {loadingSuggest && items.length === 0 && !showingHistory ? (
            <div className="space-y-0.5 p-1">
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Mencari…
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <SkeletonCircle className="h-6 w-6 flex-none bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonBar className="h-3 w-1/3 bg-white/10" />
                    <SkeletonBar className="h-2.5 w-2/3 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : showingHistory ? (
            <div>
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Pencarian terakhir
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 hover:text-rose-300"
                >
                  Hapus semua
                </button>
              </div>
              {history.map((term) => (
                <div
                  key={term}
                  className="group flex items-center gap-2 px-3 py-2 transition hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setQ(term);
                      submit({ type: "query", payload: term });
                    }}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span aria-hidden className="text-base">🕒</span>
                    <span className="truncate text-sm text-gray-100">{term}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(term);
                    }}
                    aria-label={`Hapus "${term}" dari history`}
                    className="flex h-6 w-6 flex-none items-center justify-center rounded text-gray-500 opacity-0 transition hover:bg-white/10 hover:text-rose-400 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            renderGrouped(suggestions, activeIdx, items, submit, setActiveIdx)
          )}
        </div>
      )}
    </div>
  );
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

function getSpeechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoiceSearchButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(getSpeechCtor() !== null);
  }, []);

  const start = () => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      try {
        const transcript = e.results[0][0].transcript;
        onResult(transcript);
      } catch {
        /* ignore */
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-label={listening ? "Stop voice search" : "Voice search"}
      title={listening ? "Mendengarkan... klik untuk berhenti" : "Voice search (Bahasa Indonesia)"}
      className={[
        "absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md transition",
        listening
          ? "bg-red-500 text-white animate-pulse shadow-lg"
          : "text-gray-400 hover:bg-brand-500/10 hover:text-brand-500",
      ].join(" ")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}

interface FlatItem {
  type: "merchant" | "category" | "coupon" | "query";
  payload: string;
  label: string;
  sublabel?: string;
  emoji: string;
}

function flattenSuggestions(s: AutocompleteResponse | null): FlatItem[] {
  if (!s) return [];
  const flat: FlatItem[] = [];
  s.merchants.forEach((m) =>
    flat.push({
      type: "merchant",
      payload: m.slug,
      label: m.name,
      sublabel: `${m.count} kupon · merchant`,
      emoji: "🛍️",
    })
  );
  s.categories.forEach((c) =>
    flat.push({
      type: "category",
      payload: c.slug,
      label: c.name,
      sublabel: `${c.count} kupon · kategori`,
      emoji: "📂",
    })
  );
  s.codes.forEach((c) =>
    flat.push({
      type: "coupon",
      payload: String(c.id),
      label: c.code ?? "",
      sublabel: `${c.merchant_name ?? ""} · ${c.title.slice(0, 50)}`,
      emoji: "🎟️",
    })
  );
  if (s.query) {
    flat.push({
      type: "query",
      payload: s.query,
      label: `Cari "${s.query}"`,
      sublabel: "Cari di semua kupon",
      emoji: "🔎",
    });
  }
  return flat;
}

function renderGrouped(
  s: AutocompleteResponse | null,
  activeIdx: number,
  items: FlatItem[],
  submit: (override: { type: string; payload: string }) => void,
  setActiveIdx: (i: number) => void
) {
  if (!s) return null;
  const sections: { label: string; range: [number, number] }[] = [];
  let cursor = 0;
  if (s.merchants.length > 0) {
    sections.push({ label: "Merchant", range: [cursor, cursor + s.merchants.length - 1] });
    cursor += s.merchants.length;
  }
  if (s.categories.length > 0) {
    sections.push({ label: "Kategori", range: [cursor, cursor + s.categories.length - 1] });
    cursor += s.categories.length;
  }
  if (s.codes.length > 0) {
    sections.push({ label: "Kode kupon", range: [cursor, cursor + s.codes.length - 1] });
    cursor += s.codes.length;
  }
  if (s.query) {
    sections.push({ label: "Pencarian", range: [cursor, cursor] });
  }

  return (
    <>
      {sections.map((sec) => (
        <div key={sec.label}>
          <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {sec.label}
          </div>
          {items.slice(sec.range[0], sec.range[1] + 1).map((item, idxInSec) => {
            const absIdx = sec.range[0] + idxInSec;
            const isActive = absIdx === activeIdx;
            return (
              <button
                key={`${item.type}-${item.payload}-${absIdx}`}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => submit({ type: item.type, payload: item.payload })}
                onMouseEnter={() => setActiveIdx(absIdx)}
                className={[
                  "flex w-full items-start gap-3 px-3 py-2 text-left transition",
                  isActive ? "bg-brand-500/15" : "hover:bg-white/5",
                ].join(" ")}
              >
                <span className="text-base" aria-hidden>{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-100">
                    {item.label}
                  </div>
                  {item.sublabel && (
                    <div className="truncate text-xs text-gray-400">{item.sublabel}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}
