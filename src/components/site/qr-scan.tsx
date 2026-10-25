"use client";

// Scans a KitGap QR code (a receipt link, a club invitation or a drive's
// progress page) and opens it inside the app. Codes for other sites are shown,
// never opened.

import { ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { haptic, isNativeApp, scanQrCode } from "@/lib/native";
import { buttonClass } from "../ui/button-class";

const KITGAP_PATH = /^\/(demo\/)?(receipt|join|d|drives|requests)\//;
const noop = () => () => {};

export function QrScan() {
  const router = useRouter();
  const native = useSyncExternalStore(noop, isNativeApp, () => false);
  const [message, setMessage] = useState<string | null>(null);

  if (!native) {
    return (
      <p className="tag-shape border border-line-strong bg-surface p-4">
        Open your phone&rsquo;s camera and point it at the QR code. KitGap links open right in your browser, or in the app if it&rsquo;s
        installed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={buttonClass("primary")}
        onClick={async () => {
          setMessage(null);
          const text = await scanQrCode();
          if (!text) return;
          let url: URL | null = null;
          try {
            url = new URL(text, window.location.origin);
          } catch {
            url = null;
          }
          if (url && url.origin === window.location.origin && KITGAP_PATH.test(url.pathname)) {
            await haptic("light");
            router.push(url.pathname + url.search);
          } else {
            setMessage(`That code isn't a KitGap link: ${text.slice(0, 120)}`);
          }
        }}
      >
        <ScanLine aria-hidden className="size-4" />
        Scan a QR code
      </button>
      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
