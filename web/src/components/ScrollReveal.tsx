"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Delay (ms) before revealing — useful for staggering sections. */
  delay?: number;
  /** Fire only once (default true). Set false to re-animate when scrolling away & back. */
  once?: boolean;
  /** Intersection rootMargin — trigger sooner/later relative to viewport. */
  rootMargin?: string;
  /** Optional extra class for the wrapper div. */
  className?: string;
}

/**
 * Wrap any section to give it a subtle fade+slide-up reveal animation
 * when it enters the viewport. Respects prefers-reduced-motion via globals.css.
 */
export function ScrollReveal({
  children,
  delay = 0,
  once = true,
  rootMargin = "0px 0px -100px 0px",
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => setRevealed(true), delay);
            } else {
              setRevealed(true);
            }
            if (once) obs.disconnect();
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, once, rootMargin]);

  return (
    <div
      ref={ref}
      className={["scroll-reveal", revealed ? "is-revealed" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
