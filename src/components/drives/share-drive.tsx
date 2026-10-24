"use client";

import { Mail, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";
import { CopyLink } from "../ui/copy-link";

// Every way to pass a link on: the phone's share sheet, copy, email, and a QR
// code to put on a poster or a slide at a club meeting.
export function ShareDrive({
  url,
  sentence,
  subject = "A KitGap drive",
  copyLabel = "Copy link",
  qrName = "kitgap-drive",
  size = "md",
}: {
  url: string;
  sentence: string;
  subject?: string;
  copyLabel?: string;
  qrName?: string;
  size?: "md" | "sm";
}) {
  const [canShare, setCanShare] = useState(false);
  const [qr, setQr] = useState<{ svg: string; png: string } | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanShare(typeof navigator.share === "function");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showQr || qr) return;
    let live = true;
    const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1c2a22", light: "#ffffff" } };
    Promise.all([QRCode.toString(url, { ...options, type: "svg" }), QRCode.toDataURL(url, { ...options, width: 1024 })]).then(([svg, png]) => {
      if (live) setQr({ svg, png });
    });
    return () => {
      live = false;
    };
  }, [showQr, qr, url]);

  async function share() {
    try {
      await navigator.share({ title: subject, text: sentence, url });
    } catch {
      // The visitor dismissed the share sheet.
    }
  }

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${sentence}\n\n${url}`)}`;
  const small = size === "sm";

  return (
    <div className="space-y-3">
      <div className={cn("flex flex-wrap gap-2", small ? "flex-col items-stretch" : "flex-col sm:flex-row sm:items-center")}>
        {canShare ? (
          <button type="button" onClick={share} className={cn(buttonClass("primary", small ? "sm" : "md"), "gap-2")}>
            <Share2 aria-hidden className="size-4" /> Share
          </button>
        ) : null}
        <CopyLink url={url} label={copyLabel} />
        <a href={mailto} className={cn(buttonClass("secondary", small ? "sm" : "md"), "gap-2")}>
          <Mail aria-hidden className="size-4" /> Email it
        </a>
        <button
          type="button"
          aria-expanded={showQr}
          onClick={() => setShowQr((v) => !v)}
          className={cn(buttonClass("secondary", small ? "sm" : "md"), "gap-2")}
        >
          <QrCode aria-hidden className="size-4" /> {showQr ? "Hide QR code" : "QR code"}
        </button>
      </div>
      {showQr ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line/80 bg-white p-4 text-center">
          {qr ? (
            <>
              <div
                role="img"
                aria-label={`QR code that opens ${url}`}
                className="size-48 [&_svg]:size-full"
                dangerouslySetInnerHTML={{ __html: qr.svg }}
              />
              <p className="text-sm text-muted">Phones can scan this to open the link. Put it on a poster or a slide.</p>
              <a href={qr.png} download={`${qrName}-qr.png`} className="text-sm font-semibold">
                Download the QR code (PNG)
              </a>
            </>
          ) : (
            <p className="text-sm text-muted" role="status">
              Making the QR code…
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
