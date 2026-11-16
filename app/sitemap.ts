import type { MetadataRoute } from "next";

const BASE = "https://salon-gc.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/app`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
