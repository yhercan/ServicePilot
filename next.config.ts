import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // partialPrefetching + layout Link prefetch was causing /panel↔/takvim HMR reload loops in dev
  partialPrefetching: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
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
