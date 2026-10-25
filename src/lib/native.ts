"use client";

// Native features for the iOS and Android apps (Capacitor). In a browser
// every function here falls back to the web version or does nothing, so the
// same pages work everywhere. Plugins load only inside the native app.

import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Opens the share sheet. Returns false if sharing isn't available (the caller can offer "copy" instead). */
export async function shareLink(input: { title: string; text?: string; url: string }): Promise<boolean> {
  if (isNativeApp()) {
    const { Share } = await import("@capacitor/share");
    try {
      await Share.share({ title: input.title, text: input.text, url: input.url, dialogTitle: input.title });
      return true;
    } catch {
      return false; // dismissed
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(input);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** A short tap of feedback. "success" is used when a delivery is confirmed. */
export async function haptic(kind: "success" | "light" = "light"): Promise<void> {
  if (!isNativeApp()) return;
  const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
  if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
  else await Haptics.impact({ style: ImpactStyle.Light });
}

/**
 * Scans a QR code with the camera and returns its text, or null if cancelled.
 * Only in the native app; on the web, the phone's camera app reads KitGap QR
 * codes directly.
 */
export async function scanQrCode(): Promise<string | null> {
  if (!isNativeApp()) return null;
  const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import("@capacitor/barcode-scanner");
  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      scanInstructions: "Point the camera at a KitGap QR code",
      scanButton: false,
    });
    return result.ScanResult || null;
  } catch {
    return null;
  }
}
