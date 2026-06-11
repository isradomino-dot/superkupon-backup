import type { MetadataRoute } from "next";

import { listCategories, listMerchants } from "@/lib/api";

const SITE_URL = "https://superkupon.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/decide`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/kombo`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pilihan`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/mood`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE_URL}/favorites`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/belanja-hemat`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/syarat`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [merchants, categories] = await Promise.all([
    listMerchants().catch(() => []),
    listCategories().catch(() => []),
  ]);

  const merchantRoutes: MetadataRoute.Sitemap = merchants.map((m) => ({
    url: `${SITE_URL}/merchant/${m.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...merchantRoutes, ...categoryRoutes];
}
