import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The public Publik app token (publik-app-token.txt) is read at runtime by the API routes.
  outputFileTracingIncludes: { "/api/publik/**": ["./publik-app-token.txt"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
