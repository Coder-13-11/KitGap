"use client";

import { useEffect } from "react";

// Registers public/sw.js in production builds. In development it would cache
// build assets that change on every save, so it stays off there.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installing is a nice-to-have; the site works the same without it.
    });
  }, []);
  return null;
}
