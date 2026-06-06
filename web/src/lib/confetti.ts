/**
 * Confetti animation — pure canvas, zero dependency.
 *
 * Usage:
 *   import { fireConfetti } from "@/lib/confetti";
 *
 *   onClick={(e) => {
 *     const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
 *     fireConfetti({ origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
 *   }}
 *
 * Honors prefers-reduced-motion (skip animation entirely if user opted out).
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  shape: "square" | "circle" | "ribbon";
  life: number;
}

interface FireConfettiOptions {
  origin?: { x: number; y: number };
  particleCount?: number;
  colors?: string[];
  spread?: number;
  startVelocity?: number;
  gravity?: number;
  ticks?: number;
}

const DEFAULT_COLORS = [
  "#a78bfa", // violet-400
  "#8b5cf6", // violet-500
  "#7c3aed", // violet-600
  "#f59e0b", // amber
  "#ec4899", // pink
  "#10b981", // emerald
  "#3b82f6", // sky
  "#facc15", // yellow
  "#fb7185", // rose
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function fireConfetti(opts: FireConfettiOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (prefersReducedMotion()) return;

  const {
    origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    particleCount = 110,
    colors = DEFAULT_COLORS,
    spread = 70,
    startVelocity = 14,
    gravity = 0.35,
    ticks = 130,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:100vw",
    "height:100vh",
    "pointer-events:none",
    "z-index:9999",
  ].join(";");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const particles: Particle[] = [];
  const spreadRad = (spread * Math.PI) / 180;

  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;
    const speed = startVelocity * (0.6 + Math.random() * 0.8);
    const shapes: Particle["shape"][] = ["square", "circle", "ribbon"];
    particles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.35,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 0,
    });
  }

  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particles) {
      p.life++;
      p.vy += gravity;
      p.vx *= 0.985;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      if (p.y > canvas.height + 30) continue;
      alive++;

      const alpha = Math.max(0, 1 - p.life / ticks);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "ribbon") {
        ctx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }

    if (alive > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };

  raf = requestAnimationFrame(tick);
}

/**
 * Double-burst confetti — fires from two corners for bigger celebration.
 * Use for milestone events (first save, 10th copy, etc.)
 */
export function fireDoubleBurst() {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  fireConfetti({ origin: { x: w * 0.25, y: h * 0.5 }, particleCount: 80, spread: 90 });
  setTimeout(() => {
    fireConfetti({ origin: { x: w * 0.75, y: h * 0.5 }, particleCount: 80, spread: 90 });
  }, 150);
}
