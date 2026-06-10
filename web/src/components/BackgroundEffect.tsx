"use client";

import { useEffect, useState } from "react";

/**
 * Animated network/tech/energy background effect.
 * Similar vibe to Pixabay "network loop energy technology" video — but CSS-based,
 * no external dependencies, lightweight & mobile-friendly.
 *
 * Layers:
 * 1. Dark gradient base (purple + pink radial)
 * 2. Grid pattern overlay (subtle)
 * 3. Floating particles (animated)
 * 4. Network connection lines (animated pulse)
 * 5. Glow blobs (pulsing)
 */
export function BackgroundEffect() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    setMounted(true);
    // Generate particles client-side (avoid hydration mismatch)
    const isMobile = window.innerWidth < 640;
    const count = isMobile ? 20 : 40;
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 20,
        duration: 15 + Math.random() * 25,
      })),
    );
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Layer 1: Base dark gradient with mesh */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, rgba(139, 92, 246, 0.25), transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 80%, rgba(236, 72, 153, 0.15), transparent 70%),
            radial-gradient(ellipse 60% 60% at 20% 70%, rgba(56, 189, 248, 0.1), transparent 60%),
            linear-gradient(180deg, #0a0817 0%, #1a0b2e 50%, #0a0817 100%)
          `,
        }}
      />

      {/* Layer 2: Grid pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="bg-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="rgb(167, 139, 250)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-grid)" />
      </svg>

      {/* Layer 3: Floating particles (client-only) */}
      {mounted && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <span
              key={p.id}
              className="bg-effect-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 4: Network connection lines (SVG) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(167, 139, 250)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Horizontal scan lines */}
        <line
          x1="0"
          y1="20%"
          x2="100%"
          y2="20%"
          stroke="url(#line-gradient)"
          strokeWidth="1"
          filter="url(#glow)"
        >
          <animate
            attributeName="y1"
            values="20%;80%;20%"
            dur="18s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y2"
            values="20%;80%;20%"
            dur="18s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="0"
          y1="60%"
          x2="100%"
          y2="60%"
          stroke="url(#line-gradient)"
          strokeWidth="1"
          filter="url(#glow)"
        >
          <animate
            attributeName="y1"
            values="60%;30%;60%"
            dur="22s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y2"
            values="60%;30%;60%"
            dur="22s"
            repeatCount="indefinite"
          />
        </line>
        {/* Diagonal pulse line */}
        <line
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          stroke="rgb(236, 72, 153)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
          opacity="0.4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-100"
            dur="8s"
            repeatCount="indefinite"
          />
        </line>
      </svg>

      {/* Layer 5: Glow blobs (slow pulsing) */}
      <div className="bg-effect-blob-1 absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-purple-600/25 blur-3xl" />
      <div className="bg-effect-blob-2 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-pink-600/15 blur-3xl" />
      <div className="bg-effect-blob-3 absolute top-1/2 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  );
}
