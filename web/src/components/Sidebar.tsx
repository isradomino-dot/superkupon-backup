"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SurpriseMeButton } from "@/components/SurpriseMeButton";

type Item = { href: string; icon: string; label: string; badge?: string };
type Section = { label: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    label: "Browse",
    items: [
      { href: "/", icon: "🏷️", label: "Halaman Depan" },
      { href: "/calendar", icon: "📅", label: "Calendar Kupon" },
      { href: "/stats", icon: "📊", label: "Statistik" },
      { href: "/history", icon: "🕒", label: "Riwayat" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/favorites", icon: "⭐", label: "Favorit" },
      { href: "/compare", icon: "⚖️", label: "Compare Kupon" },
      { href: "/alerts", icon: "🔔", label: "Saved Alerts" },
      { href: "/bookmarklet", icon: "🔖", label: "Bookmarklet" },
      { href: "/mockup", icon: "🎨", label: "Design Lab" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!desktop) setOpen(false);
  }, [pathname, desktop]);

  const visible = desktop || open;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed left-3 top-[62px] z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-brand-400/30 bg-gray-950/90 text-brand-300 shadow-lg backdrop-blur transition hover:border-brand-400/60 hover:text-brand-200 lg:hidden"
        aria-label={open ? "Tutup menu" : "Buka menu"}
      >
        <span className="text-lg font-bold">{open ? "✕" : "☰"}</span>
      </button>

      {open && !desktop && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-60 border-r border-brand-500/15 shadow-2xl shadow-brand-500/10 transition-transform duration-300 ease-out lg:translate-x-0",
          visible ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1a1729 0%, #15131f 60%, #0f0e1a 100%)",
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
          <div className="mb-7 select-none">
            <h2 className="sidebar-glow text-2xl font-black uppercase leading-none tracking-wider text-brand-300">
              Central
              <br />
              Super
              <br />
              Kupon
            </h2>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-brand-500/50">
              Navigation Panel
            </p>
          </div>

          <nav className="flex-1 space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.label}>
                <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-brand-500/60">
                  {section.label}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={[
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                            active
                              ? "bg-brand-400 font-bold text-gray-950 shadow-lg shadow-brand-500/40"
                              : "text-gray-300 hover:bg-brand-500/10 hover:text-brand-200",
                          ].join(" ")}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-200">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-5 space-y-3 border-t border-brand-500/15 pt-4">
            <SurpriseMeButton />
            <p className="px-1 text-[11px] leading-relaxed text-gray-400">
              Press <kbd className="rounded border border-brand-500/30 bg-brand-500/10 px-1 py-0.5 text-[10px] text-brand-300">/</kbd> untuk fokus ke search.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
