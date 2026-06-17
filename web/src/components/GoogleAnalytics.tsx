"use client";

import Script from "next/script";

/**
 * Google Analytics 4 (GA4) integration via gtag.js.
 *
 * Setup:
 * 1. Daftar di https://analytics.google.com (gratis)
 * 2. Bikin GA4 property "SuperKupon", dapet Measurement ID (G-XXXXXXXX)
 * 3. Set env var di Vercel: NEXT_PUBLIC_GA_ID=G-XXXXXXXX
 * 4. Redeploy
 *
 * Privacy:
 * - Hanya load di production (skip dev biar gak polute dashboard)
 * - Pakai strategy="afterInteractive" — gak block render
 * - Skip kalau env var kosong (graceful degradation)
 *
 * What lo dapet di GA4 dashboard:
 * - Realtime visitor count (orang online sekarang)
 * - Page views per page (homepage vs /coupon/X vs /merchant/X)
 * - Acquisition (dari mana traffic: Direct, Google, Instagram, dll)
 * - Conversion events (coupon_click, copy_code, outbound_click)
 * - Audience: country, device, browser, session duration
 * - UTM tracking (kalau IG link pake UTM params)
 *
 * Custom events di-fire via @/lib/analytics.ts (trackEvent helper).
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Skip di dev — biar gak polute production GA4 dashboard
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  // Skip kalau env var belum di-set (graceful degradation)
  if (!gaId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
