"use client";

// Sharing a need where people already are: Instagram, Facebook, group chats,
// a school announcement. A ready-made square image with a QR code, a caption
// to copy, and one tap for the phone's share sheet.
//
// Instagram can't receive a caption from a website, so on phones the image
// goes through the share sheet (which offers Instagram) and the caption is
// copied at the same time, ready to paste.

import { Check, Copy, Download, Mail, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";

export function ShareKit({ url, caption, imagePath, fileName, views }: { url: string; caption: string; imagePath: string; fileName: string; views: number | null }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      return false;
    }
  };

  const share = async () => {
    setNote(null);
    await copy();
    try {
      const blob = await (await fetch(imagePath)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: caption, url });
        return;
      }
    } catch {
      return; // dismissed
    }
    setNote("Caption copied. Save the image below and paste the caption with it.");
  };

  const encoded = encodeURIComponent(url);
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated post image, shown at its own size */}
      <img src={imagePath} alt="The square post image for this need" width={1080} height={1080} className="tag-shape w-full max-w-xs border border-line-strong" loading="lazy" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className={cn(buttonClass("primary"), "col-span-2")}>
          <Share2 aria-hidden className="size-4" /> Share post
        </button>
        <a href={imagePath} download={`${fileName}.png`} className={buttonClass("secondary")}>
          <Download aria-hidden className="size-4" /> Save image
        </a>
        <button type="button" onClick={copy} className={buttonClass("secondary")}>
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} {copied ? "Copied" : "Copy caption"}
        </button>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
          Facebook
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(caption)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
          <MessageCircle aria-hidden className="size-4" /> WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent("Can you help with this?")}&body=${encodeURIComponent(caption)}`} className={cn(buttonClass("secondary"), "col-span-2")}>
          <Mail aria-hidden className="size-4" /> Email
        </a>
      </div>
      <p role="status" className="text-sm text-muted">
        {note ?? (copied ? "Caption copied." : "")}
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-forest">See the caption</summary>
        <p className="mt-2 rounded-md bg-paper p-3">{caption}</p>
      </details>
      {views !== null ? (
        <p className="text-sm text-muted">
          <span className="tabular font-semibold text-ink">{views.toLocaleString("en-US")}</span> {views === 1 ? "view" : "views"} of this page so far.
        </p>
      ) : null}
    </div>
  );
}
