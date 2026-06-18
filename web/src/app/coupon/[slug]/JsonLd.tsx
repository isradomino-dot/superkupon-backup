import type { Coupon } from "@/lib/types";
import { formatDiscount, formatExpiry } from "@/lib/api";
import { couponSlug } from "@/lib/coupon-slug";

const SITE_URL = "https://superkupon.vercel.app";

function isExpired(iso?: string | null): boolean {
  if (!iso) return false;
  const dt = new Date(iso).getTime();
  return Number.isFinite(dt) && dt < Date.now();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function buildOffer(coupon: Coupon, canonicalUrl: string) {
  const discount = formatDiscount(coupon);
  const expired = isExpired(coupon.expires_at);

  const description =
    coupon.description ||
    `Diskon ${discount} di ${coupon.merchant.name}${
      coupon.code ? ` dengan kode ${coupon.code}` : " — promo otomatis"
    }.${coupon.expires_at ? ` Berlaku sampai ${formatExpiry(coupon.expires_at)}.` : ""}`;

  const offer: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: coupon.title,
    description,
    url: canonicalUrl,
    priceCurrency: "IDR",
    price: "0",
    validFrom: coupon.scraped_at,
    availability: expired
      ? "https://schema.org/Discontinued"
      : "https://schema.org/InStock",
    eligibleRegion: {
      "@type": "Country",
      name: "Indonesia",
    },
    seller: {
      "@type": "Organization",
      name: coupon.merchant.name,
      ...(coupon.merchant.website ? { url: coupon.merchant.website } : {}),
    },
  };

  if (coupon.expires_at) {
    offer.priceValidUntil = coupon.expires_at;
  }
  if (coupon.category?.name) {
    offer.category = coupon.category.name;
  }
  if (coupon.code) {
    offer.discountCode = coupon.code;
  }
  if (coupon.discount_value > 0) {
    offer.discount = coupon.discount_value;
  }

  const redeemCount = coupon.redeem_count ?? 0;
  if (redeemCount > 10) {
    offer.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: clamp(coupon.quality_score / 20, 1, 5).toFixed(1),
      reviewCount: redeemCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return offer;
}

function buildBreadcrumbs(coupon: Coupon, canonicalUrl: string) {
  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Beranda",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: coupon.merchant.name,
      item: `${SITE_URL}/merchant/${coupon.merchant.slug}`,
    },
  ];

  if (coupon.category) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: coupon.category.name,
      item: `${SITE_URL}/category/${coupon.category.slug}`,
    });
    items.push({
      "@type": "ListItem",
      position: 4,
      name: coupon.title,
      item: canonicalUrl,
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: coupon.title,
      item: canonicalUrl,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildFaq(coupon: Coupon) {
  const merchantName = coupon.merchant.name;
  const usageAnswer = coupon.code
    ? `Salin kode <strong>${coupon.code}</strong> di halaman ini, lalu buka ${merchantName} dan masukkan kode tersebut di kolom voucher saat checkout. Diskon akan otomatis terpotong.`
    : `Klik tombol "Pakai di ${merchantName}" di halaman ini. Promo ini otomatis aktif tanpa perlu kode — diskon langsung terpotong di checkout.`;

  const expiryAnswer = coupon.expires_at
    ? `Kupon ${merchantName} ini berlaku sampai ${formatExpiry(coupon.expires_at)}. Segera pakai sebelum kedaluwarsa.`
    : `Kupon ${merchantName} ini tidak memiliki batas waktu yang tercantum. Tetap kami sarankan segera digunakan karena merchant bisa mencabut promo kapan saja.`;

  const minSpendAnswer = coupon.min_spend
    ? `Minimum belanja untuk kupon ini adalah ${formatRupiah(coupon.min_spend)}.${
        coupon.max_discount
          ? ` Maksimal diskon yang bisa didapat adalah ${formatRupiah(coupon.max_discount)}.`
          : ""
      }`
    : `Kupon ini tidak memiliki minimum belanja${
        coupon.max_discount
          ? `, tapi maksimal diskon yang bisa didapat adalah ${formatRupiah(coupon.max_discount)}.`
          : " — bisa dipakai untuk transaksi nominal berapapun selama stok promo masih ada."
      }`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: coupon.code
          ? `Bagaimana cara pakai kode ${coupon.code} di ${merchantName}?`
          : `Bagaimana cara pakai promo ini di ${merchantName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: usageAnswer,
        },
      },
      {
        "@type": "Question",
        name: `Sampai kapan kupon ${merchantName} ini berlaku?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: expiryAnswer,
        },
      },
      {
        "@type": "Question",
        name: `Apa minimum belanja untuk kupon ${merchantName} ini?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: minSpendAnswer,
        },
      },
    ],
  };
}

export function JsonLd({ coupon }: { coupon: Coupon }) {
  const canonicalUrl = `${SITE_URL}/coupon/${couponSlug(coupon)}`;
  const blocks = [
    buildOffer(coupon, canonicalUrl),
    buildBreadcrumbs(coupon, canonicalUrl),
    buildFaq(coupon),
  ];

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
