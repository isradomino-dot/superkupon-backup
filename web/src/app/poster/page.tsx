"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { listCoupons, formatDiscount, isAbortError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { MerchantLogo } from "@/components/MerchantLogo";

export const dynamic = "force-dynamic";

// =============================================================
// TEMPLATES
// =============================================================
type TemplateId = "minimalist" | "gradient" | "neon" | "premium";
type FormatId = "square" | "story";

interface Template {
  id: TemplateId;
  label: string;
  emoji: string;
  desc: string;
  previewClass: string;
}

const TEMPLATES: Template[] = [
  {
    id: "minimalist",
    label: "Minimalist",
    emoji: "⚪",
    desc: "Clean & professional",
    previewClass: "bg-gradient-to-br from-gray-900 to-gray-700",
  },
  {
    id: "gradient",
    label: "Gradient",
    emoji: "🌈",
    desc: "Colorful & modern",
    previewClass: "bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400",
  },
  {
    id: "neon",
    label: "Neon",
    emoji: "💫",
    desc: "Cyberpunk vibes",
    previewClass: "bg-black bg-[radial-gradient(circle_at_30%_50%,rgba(0,255,255,0.3),transparent_50%)]",
  },
  {
    id: "premium",
    label: "Premium",
    emoji: "👑",
    desc: "Gold luxury feel",
    previewClass: "bg-gradient-to-br from-amber-700 via-yellow-600 to-amber-900",
  },
];

const FORMATS: { id: FormatId; label: string; emoji: string; ratio: string }[] = [
  { id: "square", label: "Square (IG Post)", emoji: "🟦", ratio: "1:1" },
  { id: "story", label: "Story (IG/WA Story)", emoji: "📱", ratio: "9:16" },
];

// =============================================================
// CANVAS DRAWING FUNCTIONS
// =============================================================

function setupCanvas(format: FormatId): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  if (format === "square") {
    canvas.width = 1080;
    canvas.height = 1080;
  } else {
    canvas.width = 1080;
    canvas.height = 1920;
  }
  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
): number {
  const words = text.split(" ");
  let line = "";
  let lines: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const lastLine = lines[maxLines - 1];
    lines[maxLines - 1] = lastLine.slice(0, lastLine.length - 3) + "...";
  }

  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function drawMinimalist(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  coupon: Coupon,
  discount: string,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1f1f2e");
  grad.addColorStop(1, "#0a0a14");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  // Top section
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SUPERKUPON", cx, 130);

  // Merchant name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.fillText(coupon.merchant.name.toUpperCase(), cx, h * 0.25);

  // Decorative line
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 100, h * 0.27);
  ctx.lineTo(cx + 100, h * 0.27);
  ctx.stroke();

  // Title
  ctx.fillStyle = "#e5e5ef";
  ctx.font = "500 36px system-ui, sans-serif";
  wrapText(ctx, coupon.title, cx, h * 0.35, w - 160, 50, 3);

  // Discount big number
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 140px system-ui, sans-serif";
  ctx.fillText(discount, cx, h * 0.6);

  // Code box
  if (coupon.code) {
    const codeY = h * 0.72;
    const boxWidth = w * 0.6;
    const boxHeight = 100;
    ctx.fillStyle = "rgba(167, 139, 250, 0.15)";
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.fillRect(cx - boxWidth / 2, codeY, boxWidth, boxHeight);
    ctx.strokeRect(cx - boxWidth / 2, codeY, boxWidth, boxHeight);
    ctx.setLineDash([]);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px monospace";
    ctx.fillText(coupon.code, cx, codeY + 70);
  }

  // Footer
  ctx.fillStyle = "#71717a";
  ctx.font = "300 22px system-ui, sans-serif";
  ctx.fillText("superkupon.vercel.app", cx, h - 90);
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  coupon: Coupon,
  discount: string,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#8b5cf6");
  grad.addColorStop(0.5, "#ec4899");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Glassmorphism card
  const cardX = 80;
  const cardY = h * 0.15;
  const cardW = w - 160;
  const cardH = h * 0.7;
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, 40);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // SUPERKUPON badge
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎟️ SUPERKUPON", cx, cardY + 70);

  // Merchant
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 60px system-ui, sans-serif";
  ctx.fillText(coupon.merchant.name, cx, cardY + 170);

  // Title
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "500 38px system-ui, sans-serif";
  wrapText(ctx, coupon.title, cx, cardY + 250, cardW - 80, 55, 3);

  // Big discount
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 160px system-ui, sans-serif";
  ctx.fillText(discount, cx, cardY + cardH * 0.6);

  // Code badge
  if (coupon.code) {
    const codeY = cardY + cardH * 0.78;
    const boxW = cardW * 0.7;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - boxW / 2, codeY - 50, boxW, 100, 20);
    } else {
      ctx.rect(cx - boxW / 2, codeY - 50, boxW, 100);
    }
    ctx.fill();

    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 56px monospace";
    ctx.fillText(coupon.code, cx, codeY + 15);
  }

  // Footer
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText("✨ superkupon.vercel.app", cx, h - 80);
}

function drawNeon(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  coupon: Coupon,
  discount: string,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  // Black background
  ctx.fillStyle = "#000510";
  ctx.fillRect(0, 0, w, h);

  // Grid pattern
  ctx.strokeStyle = "rgba(0, 200, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  for (let i = 0; i < h; i += 60) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  // Neon glow circles
  const glow1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, 400);
  glow1.addColorStop(0, "rgba(255, 0, 255, 0.4)");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, 500);
  glow2.addColorStop(0, "rgba(0, 255, 255, 0.4)");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";

  // Top tag
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff00ff";
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 32px monospace";
  ctx.fillText("[ SUPERKUPON ]", cx, 130);

  // Merchant
  ctx.shadowColor = "#00ffff";
  ctx.fillStyle = "#00ffff";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.fillText(coupon.merchant.name.toUpperCase(), cx, h * 0.25);

  // Title
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = "400 36px system-ui, sans-serif";
  wrapText(ctx, coupon.title, cx, h * 0.35, w - 200, 50, 3);

  // Discount with glow
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#ff00ff";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 150px system-ui, sans-serif";
  ctx.fillText(discount, cx, h * 0.62);

  // Code with terminal style
  if (coupon.code) {
    ctx.shadowBlur = 0;
    const codeY = h * 0.74;
    const boxW = w * 0.7;
    ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.fillRect(cx - boxW / 2, codeY, boxW, 100);
    ctx.strokeRect(cx - boxW / 2, codeY, boxW, 100);

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ffff";
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 56px monospace";
    ctx.fillText(`> ${coupon.code} <`, cx, codeY + 70);
  }

  // Footer
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff00ff";
  ctx.font = "500 22px monospace";
  ctx.fillText("// superkupon.vercel.app //", cx, h - 80);
}

function drawPremium(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  coupon: Coupon,
  discount: string,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  // Dark gold gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1a1208");
  grad.addColorStop(0.5, "#2d1f0d");
  grad.addColorStop(1, "#1a1208");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Gold frame
  const goldGrad = ctx.createLinearGradient(0, 0, w, h);
  goldGrad.addColorStop(0, "#ca8a04");
  goldGrad.addColorStop(0.5, "#fde047");
  goldGrad.addColorStop(1, "#ca8a04");
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, w - 100, h - 100);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ca8a04";
  ctx.strokeRect(70, 70, w - 140, h - 140);

  ctx.textAlign = "center";

  // Crown emoji
  ctx.font = "80px system-ui, sans-serif";
  ctx.fillText("👑", cx, 180);

  // PREMIUM label
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 28px serif";
  ctx.fillText("◆ PREMIUM EXCLUSIVE ◆", cx, 230);

  // Merchant
  ctx.fillStyle = goldGrad;
  ctx.font = "bold 64px serif";
  ctx.fillText(coupon.merchant.name, cx, h * 0.32);

  // Decorative
  ctx.fillStyle = "#ca8a04";
  ctx.font = "32px serif";
  ctx.fillText("✦ ─────── ✦", cx, h * 0.36);

  // Title
  ctx.fillStyle = "#fef3c7";
  ctx.font = "italic 36px serif";
  wrapText(ctx, coupon.title, cx, h * 0.43, w - 200, 50, 3);

  // Discount
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 150px serif";
  ctx.fillText(discount, cx, h * 0.65);

  // Code with serif box
  if (coupon.code) {
    const codeY = h * 0.77;
    const boxW = w * 0.6;

    ctx.fillStyle = "rgba(202, 138, 4, 0.2)";
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 2;
    ctx.fillRect(cx - boxW / 2, codeY, boxW, 100);
    ctx.strokeRect(cx - boxW / 2, codeY, boxW, 100);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 52px monospace";
    ctx.fillText(coupon.code, cx, codeY + 68);
  }

  // Footer
  ctx.fillStyle = "#ca8a04";
  ctx.font = "italic 22px serif";
  ctx.fillText("— superkupon.vercel.app —", cx, h - 100);
}

function drawTemplate(
  template: TemplateId,
  canvas: HTMLCanvasElement,
  coupon: Coupon,
  discount: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  switch (template) {
    case "minimalist":
      drawMinimalist(ctx, canvas, coupon, discount);
      break;
    case "gradient":
      drawGradient(ctx, canvas, coupon, discount);
      break;
    case "neon":
      drawNeon(ctx, canvas, coupon, discount);
      break;
    case "premium":
      drawPremium(ctx, canvas, coupon, discount);
      break;
  }
}

// =============================================================
// PAGE
// =============================================================
export default function PosterPage() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [template, setTemplate] = useState<TemplateId>("gradient");
  const [format, setFormat] = useState<FormatId>("square");
  const [generating, setGenerating] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load coupons
  useEffect(() => {
    const ctrl = new AbortController();
    listCoupons({ sort: "quality", limit: 30 }, { signal: ctrl.signal })
      .then((c) => setCoupons(c))
      .catch((e) => {
        if (!isAbortError(e)) setCoupons([]);
      });
    return () => ctrl.abort();
  }, []);

  // Update preview when coupon/template/format changes
  useEffect(() => {
    if (!selectedCoupon || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    if (format === "square") {
      canvas.width = 1080;
      canvas.height = 1080;
    } else {
      canvas.width = 1080;
      canvas.height = 1920;
    }
    drawTemplate(template, canvas, selectedCoupon, formatDiscount(selectedCoupon, t));
  }, [selectedCoupon, template, format, t]);

  const handleDownload = () => {
    if (!selectedCoupon) return;
    setGenerating(true);
    try {
      const canvas = setupCanvas(format);
      drawTemplate(template, canvas, selectedCoupon, formatDiscount(selectedCoupon, t));
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const merchantSlug = selectedCoupon.merchant.slug;
        const code = selectedCoupon.code || "coupon";
        a.download = `superkupon-${merchantSlug}-${code}-${template}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setTimeout(() => setGenerating(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-pink-500/10 to-transparent p-6 animate-slide-up">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
          <span className="text-4xl">🎨</span>
          Coupon Wallpaper Generator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">
          Bikin{" "}
          <span className="font-semibold text-brand-300">gambar cantik kupon</span> untuk
          share ke Instagram Story, WhatsApp, atau Twitter. Pilih kupon + template +
          format → download PNG instan.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        {/* CONTROLS */}
        <div className="space-y-4">
          {/* Step 1: Pick coupon */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
                1
              </span>
              Pilih Kupon
            </h2>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-2">
              {coupons.length === 0 ? (
                <p className="text-sm text-gray-400">Loading kupon...</p>
              ) : (
                coupons.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCoupon(c)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition",
                      selectedCoupon?.id === c.id
                        ? "border-brand-400 bg-brand-500/15"
                        : "border-white/5 bg-white/5 hover:border-brand-400/30 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <MerchantLogo merchant={c.merchant} size={28} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-brand-300">
                        {c.merchant.name}
                      </p>
                      <p className="line-clamp-1 text-xs font-semibold text-white">
                        {c.title}
                      </p>
                    </div>
                    <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
                      {formatDiscount(c, t)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Step 2: Template */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
                2
              </span>
              Pilih Template
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className={[
                    "overflow-hidden rounded-xl border-2 transition",
                    template === tpl.id
                      ? "scale-105 border-brand-400 shadow-lg shadow-brand-500/40"
                      : "border-white/10 hover:border-brand-400/50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex aspect-square items-center justify-center text-4xl",
                      tpl.previewClass,
                    ].join(" ")}
                  >
                    {tpl.emoji}
                  </div>
                  <div className="p-2 text-left">
                    <p className="text-xs font-bold text-white">{tpl.label}</p>
                    <p className="text-[10px] text-gray-400">{tpl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Format */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white">
                3
              </span>
              Pilih Format
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id)}
                  className={[
                    "rounded-xl border p-4 text-left transition",
                    format === fmt.id
                      ? "border-brand-400 bg-brand-500/15 shadow-lg shadow-brand-500/30"
                      : "border-white/10 bg-white/5 hover:border-brand-400/40",
                  ].join(" ")}
                >
                  <div className="text-2xl">{fmt.emoji}</div>
                  <p className="mt-2 text-sm font-bold text-white">{fmt.label}</p>
                  <p className="text-[10px] text-gray-400">Aspect {fmt.ratio}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Download CTA */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedCoupon || generating}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 px-6 py-4 text-base font-black text-white shadow-2xl shadow-brand-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "📥 Mengunduh..."
              : !selectedCoupon
                ? "👈 Pilih kupon dulu"
                : "📥 Download PNG"}
          </button>
        </div>

        {/* PREVIEW */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            🖼️ Preview Live
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {!selectedCoupon ? (
              <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-center">
                <div className="text-5xl">🖼️</div>
                <p className="text-sm text-gray-400">
                  Pilih kupon dulu untuk lihat preview
                </p>
              </div>
            ) : (
              <div
                className={[
                  "mx-auto overflow-hidden rounded-xl border border-white/10",
                  format === "square" ? "max-w-full" : "max-w-[280px]",
                ].join(" ")}
              >
                <canvas
                  ref={previewCanvasRef}
                  className="block w-full h-auto"
                />
              </div>
            )}
          </div>

          {selectedCoupon && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                💡 Cara pakai
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-gray-300">
                <li>Download PNG</li>
                <li>Upload ke Instagram Story / WhatsApp Status</li>
                <li>Tag temen kalo mau bagi kupon</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/10 to-transparent p-6 text-center">
        <h2 className="text-base font-bold text-white">
          🎁 Mau share kupon dengan cara lain?
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Cek "Bagi Kupon ke Teman" di Belanja Hemat untuk share teks ke WhatsApp/Telegram.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/belanja-hemat"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🎉 Belanja Hemat
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            🏠 Beranda
          </Link>
        </div>
      </section>
    </div>
  );
}
