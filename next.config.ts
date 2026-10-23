import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every KitGap page shows live quantities, so pages render fresh on each
  // request instead of being prerendered and cached (Cache Components off).
  cacheComponents: false,
  poweredByHeader: false,
  // The demo sandbox builds its tables from these SQL files at runtime.
  outputFileTracingIncludes: {
    "/**": ["./db/migrations/*.sql"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
