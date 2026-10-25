"use client";

// Inside the iOS or Android app: Android's back button goes back a page (and
// leaves the app from the first one), the status bar matches the header, and
// the splash screen hides once the first page is ready. In a browser it does
// nothing.

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native";

export function NativeShell() {
  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.dataset.native = "true";
    let remove: (() => void) | undefined;
    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
      remove = () => void handle.remove();
      await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      await SplashScreen.hide().catch(() => {});
    })();
    return () => remove?.();
  }, []);
  return null;
}
