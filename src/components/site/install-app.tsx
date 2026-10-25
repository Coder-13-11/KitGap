"use client";

// Installing KitGap on a phone. Android and desktop Chrome or Edge offer an
// install prompt the page can trigger; iPhone and iPad need Share → "Add to
// Home Screen", so those get the steps instead.

import { Check, Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { buttonClass } from "../ui/button-class";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noop = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function platform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function installed(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function InstallApp() {
  const client = useIsClient();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!client) return null;

  if (done || installed()) {
    return (
      <p className="tag-shape flex items-center gap-3 border border-forest/40 bg-forest-tint p-4 font-semibold text-forest-dark">
        <Check aria-hidden className="size-5" />
        KitGap is installed. Open it from your home screen.
      </p>
    );
  }

  if (prompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === "accepted") setDone(true);
          setPrompt(null);
        }}
        className={buttonClass("primary")}
      >
        <Download aria-hidden className="size-4" />
        Install KitGap
      </button>
    );
  }

  const os = platform();
  if (os === "ios") {
    return (
      <ol className="tag-shape space-y-3 border border-line-strong bg-surface p-5 shadow-card">
        <li className="flex items-start gap-3">
          <span className="tabular font-serif text-xl font-semibold text-forest">1</span>
          <span>
            Open this page in <strong>Safari</strong>, then tap <Share aria-label="Share" className="inline size-5 align-[-4px] text-forest" />{" "}
            <strong>Share</strong>.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="tabular font-serif text-xl font-semibold text-forest">2</span>
          <span>
            Choose <SquarePlus aria-hidden className="inline size-5 align-[-4px] text-forest" /> <strong>Add to Home Screen</strong>, then{" "}
            <strong>Add</strong>.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="tabular font-serif text-xl font-semibold text-forest">3</span>
          <span>Open KitGap from your home screen. It runs full screen, with a tab bar at the bottom.</span>
        </li>
      </ol>
    );
  }

  return (
    <p className="tag-shape border border-line-strong bg-surface p-4">
      {os === "android"
        ? "Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”."
        : "In Chrome or Edge, use the install icon at the right of the address bar, or open this page on your phone."}
    </p>
  );
}
