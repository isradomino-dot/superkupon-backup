"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

/**
 * Natural language search — parse user query → backend filter params.
 *
 * Example queries:
 *   "kupon makan murah" → category=food, sort=quality
 *   "shopee diskon 50 ribu" → merchant=shopee, min_discount=50000
 *   "ovo cashback" → merchant=ovo, discount_type=cashback
 *   "buat liburan ke bandung" → region=bandung, category=transport/entertainment
 *
 * Bukan AI beneran, tapi smart regex + dictionary lookup.
 * User-facing terlihat AI-powered.
 */

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  results?: Coupon[];
}

// Dictionary intent
const CATEGORY_KEYWORDS: Record<string, string> = {
  makan: "food", makanan: "food", food: "food", minum: "food", kuliner: "food",
  belanja: "ecommerce", baju: "fashion", fashion: "fashion", busana: "fashion", outfit: "fashion",
  transport: "transport", ojek: "transport", taksi: "transport", grab: "transport",
  hiburan: "entertainment", film: "entertainment", nonton: "entertainment", streaming: "entertainment",
  tagihan: "bills", pulsa: "bills", listrik: "bills", topup: "bills",
};

const MERCHANT_KEYWORDS: Record<string, string> = {
  shopee: "shopee", tokopedia: "tokopedia", gojek: "gojek", grab: "grab",
  ovo: "ovo", dana: "dana", gopay: "gopay", linkaja: "linkaja",
  traveloka: "traveloka", tiket: "tiket", klook: "klook",
  lazada: "lazada", blibli: "blibli", bukalapak: "bukalapak", zalora: "zalora",
  bca: "bca", mandiri: "mandiri", bri: "bri",
  telkomsel: "telkomsel", indosat: "indosat", xl: "xl",
  tixid: "tixid",
};

const DISCOUNT_TYPE_KEYWORDS: Record<string, string> = {
  cashback: "cashback",
  persen: "percent", "%": "percent",
  ongkir: "free_shipping", gratis_ongkir: "free_shipping",
  bogo: "bogo", "beli 1": "bogo",
};

const REGION_KEYWORDS: Record<string, string> = {
  jakarta: "jakarta", jkt: "jakarta",
  bandung: "bandung", bdg: "bandung",
  surabaya: "surabaya", sby: "surabaya",
};

interface ParseResult {
  category?: string;
  merchant?: string;
  discount_type?: string;
  region?: string;
  min_discount?: number;
  q?: string;
  matched: string[];
}

function parseQuery(text: string): ParseResult {
  const lower = text.toLowerCase();
  const result: ParseResult = { matched: [] };

  // Detect merchant (priority — most specific)
  for (const [kw, slug] of Object.entries(MERCHANT_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.merchant = slug;
      result.matched.push(`merchant: ${kw}`);
      break;
    }
  }

  // Detect category
  for (const [kw, slug] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.category = slug;
      result.matched.push(`kategori: ${kw}`);
      break;
    }
  }

  // Detect discount type
  for (const [kw, typ] of Object.entries(DISCOUNT_TYPE_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.discount_type = typ;
      result.matched.push(`tipe: ${kw}`);
      break;
    }
  }

  // Detect region
  for (const [kw, reg] of Object.entries(REGION_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.region = reg;
      result.matched.push(`region: ${kw}`);
      break;
    }
  }

  // Detect number for min_discount (e.g. "50 ribu", "100rb", "50%")
  const numMatch = lower.match(/(\d+)\s*(ribu|rb|k|%|persen)?/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    const unit = numMatch[2];
    if (unit === "ribu" || unit === "rb" || unit === "k") {
      result.min_discount = n * 1000;
      result.matched.push(`min ${n}rb`);
    } else if (unit === "%" || unit === "persen") {
      result.min_discount = n;
      result.matched.push(`min ${n}%`);
    }
  }

  return result;
}

function buildBotResponse(parsed: ParseResult, count: number): string {
  if (count === 0) {
    return "Hmm, aku belum nemu kupon yang cocok. Coba kata kunci lain ya — misal 'shopee diskon' atau 'kupon makan'.";
  }
  const parts: string[] = [];
  if (parsed.matched.length > 0) {
    parts.push(`Aku ngerti kamu mau: ${parsed.matched.join(", ")}.`);
  }
  parts.push(`Ini ${count} kupon yang cocok:`);
  return parts.join(" ");
}

export function AskSuperKupon() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Halo! Aku SuperKupon. Tanya aja apa yg kamu cari — misal 'kupon makan murah', 'shopee cashback', atau 'diskon ojek'.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const parsed = parseQuery(text);
      // If no specific intent detected, fall back to q (substring search)
      if (!parsed.merchant && !parsed.category && !parsed.discount_type && !parsed.region) {
        parsed.q = text;
      }

      const results = await listCoupons({
        merchant: parsed.merchant,
        category: parsed.category,
        discount_type: parsed.discount_type,
        region: parsed.region,
        min_discount: parsed.min_discount,
        q: parsed.q,
        sort: "quality",
        limit: 5,
      }).catch(() => [] as Coupon[]);

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: buildBotResponse(parsed, results.length),
          results: results.slice(0, 5),
        },
      ]);
    } catch (e) {
      if (!isAbortError(e)) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "Maaf, ada error. Coba lagi yaa." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickSuggestions = [
    "kupon makan murah",
    "shopee cashback",
    "diskon ojek jakarta",
    "ovo gratis ongkir",
  ];

  return (
    <>
      {/* Floating bubble button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tanya SuperKupon"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-2xl shadow-2xl shadow-brand-500/40 transition hover:scale-110 hover:shadow-brand-500/60 sm:h-16 sm:w-16 sm:text-3xl"
      >
        🤖
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      </button>

      {/* Chat modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-brand-400/40 bg-gradient-to-br from-slate-900 to-purple-950 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-brand-500/20 to-purple-500/20 p-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🤖</span>
                <div>
                  <h2 className="text-base font-bold text-white">Tanya SuperKupon</h2>
                  <p className="flex items-center gap-1 text-[10px] text-emerald-300">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Online · Smart Search
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="rounded-full p-2 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "rounded-br-sm bg-brand-500 text-white"
                        : "rounded-bl-sm border border-white/10 bg-white/5 text-gray-100",
                    ].join(" ")}
                  >
                    {msg.role === "bot" && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-300">
                        🤖 SuperKupon
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.results && msg.results.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {msg.results.map((c) => (
                          <Link
                            key={c.id}
                            href={`/coupon/${c.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition hover:border-brand-400/50 hover:bg-white/10"
                          >
                            <MerchantLogo merchant={c.merchant} size={28} rounded="md" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase text-brand-300">
                                {c.merchant.name}
                              </p>
                              <p className="line-clamp-1 text-xs font-bold text-white">
                                {c.title}
                              </p>
                            </div>
                            <span className="flex-none rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
                              {formatDiscount(c, t)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
                  </span>
                  Mikir...
                </div>
              )}
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <div className="border-t border-white/10 px-4 py-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  💡 Coba tanya:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-gray-300 transition hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition focus-within:border-brand-400/60">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya apa aja..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  Tanya →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
