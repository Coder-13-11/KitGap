import type { CapacitorConfig } from "@capacitor/cli";

// The iOS and Android apps. They load the deployed KitGap site (set
// CAP_SERVER_URL to it before `npx cap sync`), so they always show live data
// and get updates without a store release, and they add native features the
// website can't have: the share sheet, haptics, a QR scanner for receipt
// links, the Android back button and a themed status bar (src/lib/native.ts).
//
// mobile/www is only the fallback screen shown if the site can't be reached.
// See docs/mobile.md for building and submitting the apps.

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  // Change to a reverse-domain ID you own before the first store upload; it
  // can't be changed after an app is published.
  appId: "org.kitgap.app",
  appName: "KitGap",
  webDir: "mobile/www",
  server: serverUrl
    ? { url: serverUrl, cleartext: false, errorPath: "index.html", allowNavigation: [new URL(serverUrl).host] }
    : undefined,
  backgroundColor: "#f1e6d6",
  ios: { contentInset: "never", scheme: "KitGap" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 900, backgroundColor: "#f1e6d6", showSpinner: false },
    StatusBar: { backgroundColor: "#fbf6ec", style: "LIGHT", overlaysWebView: false },
  },
};

export default config;
