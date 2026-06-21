import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=0" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // DB stores merchant.logo_url as /logos/<slug>.png, but assets on disk are .svg.
      // Rewrite at the edge so legacy .png paths resolve to the actual .svg files.
      {
        source: "/logos/:name.png",
        destination: "/logos/:name.svg",
      },
    ];
  },
};

export default nextConfig;
