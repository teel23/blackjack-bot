import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: every route is prerendered to out/, served by Netlify, precached for offline.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
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
