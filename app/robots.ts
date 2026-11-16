import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/avatars"] },
    sitemap: "https://salon-gc.vercel.app/sitemap.xml",
  };
}
