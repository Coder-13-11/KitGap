import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every KitGap page shows live quantities, so pages render fresh on each
  // request instead of being prerendered and cached (Cache Components off).
  cacheComponents: false,
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [
      {
        source: "/((?!tools).*)",
        headers: [...base, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }],
      },
      {
        // The photo counter uses the camera, and runs its model with several
        // threads, which browsers only allow on cross-origin-isolated pages.
        source: "/tools/:path*",
        headers: [
          ...base,
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/tools",
        headers: [
          ...base,
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // An isolated page can only start a worker whose script is served with
        // a matching embedder policy. Pages without one ignore this header.
        source: "/_next/static/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
    ];
  },
};

export default nextConfig;
