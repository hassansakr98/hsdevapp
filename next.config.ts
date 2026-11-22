import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // self-contained server for Docker / VPS
  cacheComponents: true,
  partialPrefetching: true,
  // Allow Excel uploads up to 10MB through server actions
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
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
