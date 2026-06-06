import Link from "next/link";

import { listCoupons, getMerchant } from "@/lib/api";
import { CouponCard } from "@/components/CouponCard";
import { MerchantStats } from "@/components/MerchantStats";
import { MerchantLogo } from "@/components/MerchantLogo";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { FollowMerchantButton } from "@/components/FollowMerchantButton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MerchantPage({ params }: PageProps) {
  const { slug } = await params;
  const [merchant, coupons] = await Promise.all([
    getMerchant(slug).catch(() => null),
    listCoupons({ merchant: slug, limit: 100, sort: "quality" }).catch(() => []),
  ]);

  if (!merchant) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-gray-200">Merchant tidak ditemukan.</p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm text-brand-300 hover:underline"
        >
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-30 -mx-4 border-b border-white/10 bg-gray-950/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <nav className="text-xs text-gray-400">
          <Link href="/" className="hover:text-brand-300 hover:underline">
            Beranda
          </Link>{" "}
          / <span className="font-medium text-gray-100">{merchant.name}</span>
        </nav>
      </div>

      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-transparent to-transparent p-6 animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <MerchantLogo merchant={merchant} size={56} rounded="md" />
            <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{merchant.name}</h1>
            {merchant.website && (
              <a
                href={merchant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-brand-300 hover:underline"
              >
                {merchant.website} ↗
              </a>
            )}
            <p className="mt-2 text-sm text-gray-300">
              {coupons.length} kupon aktif · diurutkan berdasarkan kualitas
            </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FollowMerchantButton merchantSlug={slug} merchantName={merchant.name} />
            <NotifyMeButton merchantSlug={slug} merchantName={merchant.name} />
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10"
            >
              ← Semua merchant
            </Link>
          </div>
        </div>
      </header>

      <MerchantStats slug={slug} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Semua Kupon {merchant.name}
        </h2>
        {coupons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-gray-400">
            Belum ada kupon aktif untuk merchant ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((c) => (
              <CouponCard key={c.id} coupon={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
