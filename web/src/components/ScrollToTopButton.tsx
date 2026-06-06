"use client";

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 400;

/**
 * Floating bottom-right button. Appears after user scrolls 400px down.
 * Click → smooth scroll to top. Mount globally in layout.
 */
export function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setShow(window.scrollY > SCROLL_THRESHOLD);
    };
    // Initial sync (in case user lands on a deep scroll position via anchor)
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleClick = () => {
    if (typeof window === "undefined") return;
    // Respect reduced-motion preference
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll ke atas halaman"
      title="Ke atas"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-700 text-xl font-bold text-white shadow-2xl shadow-brand-500/40 transition hover:scale-110 hover:shadow-brand-500/60 active:scale-95 animate-fade-in"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
