"use client";

// Copies a link. If the clipboard isn't available (some browsers, insecure
// contexts), the link is shown selected in a text box to copy by hand.

import { Check, Link2 } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClass } from "./button";

export function CopyLink({ url, label = "Copy link", description }: { url: string; label?: string; description?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setState("copied");
      window.setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("manual");
      window.setTimeout(() => inputRef.current?.select(), 0);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={copy} className={buttonClass("secondary", "md")}>
        {state === "copied" ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />}
        {state === "copied" ? "Link copied" : label}
      </button>
      <p role="status" className="text-sm text-muted">
        {state === "copied" ? `Copied ${url}` : state === "manual" ? "Your browser didn't allow copying. Select the link below and copy it." : description ?? ""}
      </p>
      {state === "manual" ? (
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Link to copy"
          className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
