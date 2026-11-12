import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // lib/publik.ts reads the public publik app token from the repo root at run time; ship it with the server routes.
  outputFileTracingIncludes: { "/api/**": ["./publik-app-token.txt"] },
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
