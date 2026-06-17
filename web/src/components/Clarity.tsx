"use client";

import Script from "next/script";

/**
 * Microsoft Clarity heatmap + session recording integration.
 *
 * Setup:
 * 1. Daftar di https://clarity.microsoft.com (gratis unlimited)
 * 2. Bikin project "SuperKupon", dapat Project ID (10-char string)
 * 3. Set env var di Vercel: NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
 * 4. Redeploy — Clarity auto-track session, heatmap, dead click, rage click
 *
 * Privacy:
 * - Hanya load di production (skip di dev biar gak noise di dashboard)
 * - Gunakan strategy="afterInteractive" — gak block render
 * - User bisa opt-out via DoNotTrack browser setting (Clarity respect ini)
 *
 * What lo dapet di Clarity dashboard:
 * - Session recordings (video user click/scroll/type — gratis unlimited)
 * - Heatmap (di mana user paling sering klik)
 * - Dead clicks (user klik tapi gak ada response — biasanya bug)
 * - Rage clicks (klik berulang frustasi — UX issue)
 * - Quick backs (user buka page langsung close — content issue)
 * - Scroll depth (sampai mana user baca)
 *
 * Highest ROI tracking tool buat MVP — gratis, unlimited, langsung kasih insight.
 */
export function Clarity() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  // Skip di dev — biar gak polute Clarity dashboard dengan local test session
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  // Skip kalau env var belum di-set (graceful degradation)
  if (!clarityId) {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
        `,
      }}
    />
  );
}
