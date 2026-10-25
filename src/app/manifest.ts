import type { MetadataRoute } from "next";

// Makes KitGap installable: on Android "Install app", on iPhone "Add to Home
// Screen". It then opens full screen with its own icon, like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KitGap",
    short_name: "KitGap",
    description: "Give what's actually needed. Run a kit drive, collect only what's on the list, and get it confirmed.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1e6d6",
    theme_color: "#234d3b",
    categories: ["social", "lifestyle", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My drives", url: "/drives", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Run your own drive", url: "/drives/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Try the demo", url: "/demo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
