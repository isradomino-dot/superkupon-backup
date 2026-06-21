import type { Metadata } from "next";
import Link from "next/link";
import { listCoupons, listCategories } from "@/lib/api";
import { CouponCard } from "@/components/CouponCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cats = await listCategories().catch(() => []);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return { title: "Kategori tidak ditemukan", robots: { index: false } };
  const title = `Kupon ${cat.name} Terbaru — Diskon & Promo | SuperKupon`;
  const description = `Kupon dan promo ${cat.name} terbaru yang sudah diverifikasi. Update otomatis tiap jam dari merchant Indonesia.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const [categories, coupons] = await Promise.all([
    listCategories().catch(() => []),
    listCoupons({ category: slug, limit: 100 }).catch(() => []),
  ]);

  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-700">Kategori &quot;{slug}&quot; tidak ditemukan.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">
          Beranda
        </Link>{" "}
        / <span className="text-gray-900">{category.name}</span>
      </nav>

      <header className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Kategori: {category.name}</h1>
        <p className="mt-2 text-sm text-gray-600">{coupons.length} kupon aktif.</p>
      </header>

      {coupons.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada kupon di kategori ini.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </div>
      )}
    </div>
  );
}
