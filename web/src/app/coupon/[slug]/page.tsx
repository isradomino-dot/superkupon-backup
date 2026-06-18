import type { Metadata } from "next";
import Link from "next/link";

import type { Coupon } from "@/lib/types";
import { formatDiscount, formatExpiry, getCoupon } from "@/lib/api";
import { couponSlug, parseCouponSlug } from "@/lib/coupon-slug";
import { CouponDetailClient } from "./CouponDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

const SITE_URL = "https://superkupon.vercel.app";

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function isExpiredCoupon(iso?: string | null): boolean {
  if (!iso) return false;
  const dt = new Date(iso).getTime();
  return Number.isFinite(dt) && dt < Date.now();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseCouponSlug(slug);
  if (id === null) {
    return { title: "Kupon tidak ditemukan", robots: { index: false, follow: false } };
  }
  const coupon = await getCoupon(id).catch(() => null);
  if (!coupon) {
    return { title: "Kupon tidak ditemukan", robots: { index: false, follow: false } };
  }

  const discount = formatDiscount(coupon);
  const canonicalPath = `/coupon/${couponSlug(coupon)}`;
  const expired = isExpiredCoupon(coupon.expires_at);

  const codePart = coupon.code ? `Pakai kode ${coupon.code} di ${coupon.merchant.name}` : `Promo otomatis di ${coupon.merchant.name}`;
  const minSpendPart = coupon.min_spend ? `, min belanja ${formatRupiah(coupon.min_spend)}` : "";
  const expiryPart = coupon.expires_at ? ` Berlaku sampai ${formatExpiry(coupon.expires_at)}.` : "";
  const descPrefix = coupon.description ? `${coupon.description.slice(0, 100)} ` : "";
  const description = `${coupon.title}. ${descPrefix}${codePart}${minSpendPart}.${expiryPart} Cek kupon ${coupon.merchant.name} lainnya di SuperKupon.`.slice(0, 160);

  const keywords = [
    `kode promo ${coupon.merchant.name}`,
    `kupon ${coupon.merchant.name}`,
    `diskon ${coupon.merchant.name}`,
    coupon.code || undefined,
    coupon.category?.name || undefined,
  ].filter((k): k is string => Boolean(k));

  return {
    title: `Kode Promo ${coupon.merchant.name} ${discount} — ${coupon.title}`,
    description,
    keywords,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${discount} di ${coupon.merchant.name} — Kode ${coupon.code || "otomatis"}`,
      description: coupon.description || coupon.title,
      type: "website",
      url: canonicalPath,
      locale: "id_ID",
      siteName: "SuperKupon",
    },
    twitter: { card: "summary_large_image" },
    robots: expired
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    other: coupon.expires_at ? { "article:expiration_time": coupon.expires_at } : {},
  };
}

function buildJsonLd(coupon: Coupon): object[] {
  const canonicalUrl = `${SITE_URL}/coupon/${couponSlug(coupon)}`;
  const expired = isExpiredCoupon(coupon.expires_at);
  const discount = formatDiscount(coupon);

  const offerDescription =
    coupon.description ||
    `Diskon ${discount} di ${coupon.merchant.name}${coupon.code ? ` dengan kode ${coupon.code}` : ""}.${coupon.expires_at ? ` Berlaku sampai ${formatExpiry(coupon.expires_at)}.` : ""}`;

  const offer: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: coupon.title,
    description: offerDescription,
    url: canonicalUrl,
    priceCurrency: "IDR",
    price: "0",
    validFrom: coupon.scraped_at,
    availability: expired ? "https://schema.org/Discontinued" : "https://schema.org/InStock",
    eligibleRegion: { "@type": "Country", name: "Indonesia" },
    seller: {
      "@type": "Organization",
      name: coupon.merchant.name,
      ...(coupon.merchant.website ? { url: coupon.merchant.website } : {}),
    },
  };
  if (coupon.expires_at) offer.priceValidUntil = coupon.expires_at;
  if (coupon.category?.name) offer.category = coupon.category.name;
  if (coupon.code) offer.discountCode = coupon.code;
  if (coupon.discount_value > 0) offer.discount = coupon.discount_value;
  if ((coupon.redeem_count ?? 0) > 10) {
    const rating = Math.min(5, Math.max(1, coupon.quality_score / 20));
    offer.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount: coupon.redeem_count,
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: coupon.merchant.name,
        item: `${SITE_URL}/merchant/${coupon.merchant.slug}`,
      },
      { "@type": "ListItem", position: 3, name: coupon.title, item: canonicalUrl },
    ],
  };

  const faqAnswers: { q: string; a: string }[] = [];
  if (coupon.code) {
    faqAnswers.push({
      q: `Bagaimana cara pakai kode ${coupon.code}?`,
      a: `Salin kode ${coupon.code}, buka ${coupon.merchant.name}, belanja seperti biasa, lalu masukkan kode di halaman checkout. Diskon akan otomatis terhitung.`,
    });
  } else {
    faqAnswers.push({
      q: `Bagaimana cara pakai promo ini di ${coupon.merchant.name}?`,
      a: `Promo ini berjalan otomatis tanpa kode. Cukup buka ${coupon.merchant.name} dan diskon akan langsung diterapkan di checkout sesuai syarat berlaku.`,
    });
  }
  if (coupon.expires_at) {
    faqAnswers.push({
      q: "Sampai kapan kode berlaku?",
      a: `Kode ini berlaku sampai ${formatExpiry(coupon.expires_at)}. Setelah tanggal tersebut kode tidak bisa digunakan lagi.`,
    });
  }
  if (coupon.min_spend) {
    faqAnswers.push({
      q: "Apa minimum belanja untuk kupon ini?",
      a: `Minimum belanja untuk pakai kupon ini adalah ${formatRupiah(coupon.min_spend)}.`,
    });
  } else {
    faqAnswers.push({
      q: "Apa minimum belanja untuk kupon ini?",
      a: "Tidak ada minimum belanja khusus untuk kupon ini, tapi cek syarat di halaman merchant untuk detail terbaru.",
    });
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqAnswers.slice(0, 3).map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return [offer, breadcrumb, faq];
}

export default async function CouponDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const id = parseCouponSlug(slug);

  if (id === null) {
    return <NotFoundView message="ID kupon tidak valid" />;
  }

  const coupon = await getCoupon(id).catch(() => null);

  if (!coupon) {
    return <NotFoundView message="Kupon tidak ditemukan" />;
  }

  const jsonLd = buildJsonLd(coupon);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CouponDetailClient coupon={coupon} />
    </>
  );
}

function NotFoundView({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        ← Kembali ke beranda
      </Link>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
        <div className="text-6xl" aria-hidden>
          🔍
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{message}</h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          Kupon yang lo cari mungkin sudah expired, dihapus, atau ID-nya salah. Coba browse kupon
          lain dari beranda.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Lihat kupon lainnya
        </Link>
      </div>
    </div>
  );
}
