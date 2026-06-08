import type { MetadataRoute } from "next";

const SITE_URL = "https://superkupon.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/dashboard", "/mockup"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
