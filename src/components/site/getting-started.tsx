"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { StartItem } from "@/domain/onboarding";
import { AppLink } from "../ui/base";
import { cn } from "../ui/cn";

function cookieName(id: string) {
  return `kg-start-${id}`;
}

function rememberHidden(id: string) {
  document.cookie = `${cookieName(id)}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.localStorage.setItem(`kg-start-hidden:${id}`, "1");
}

function wasHiddenHere(id: string) {
  return window.localStorage.getItem(`kg-start-hidden:${id}`) === "1";
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// A short first-run list. Dismissing it is remembered in this browser;
// it also stops showing once every item is done.
export function GettingStarted({
  id,
  title,
  items,
  defaultHidden = false,
}: {
  id: string;
  title: string;
  items: StartItem[];
  defaultHidden?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  // Read on the client only; the server can't see localStorage, so it renders
  // the list unless the cookie already told it to hide.
  const hiddenHere = useSyncExternalStore(
    subscribeToStorage,
    () => wasHiddenHere(id),
    () => false,
  );
  const hidden = defaultHidden || dismissed || hiddenHere;

  useEffect(() => {
    // Copy a hide from localStorage into the cookie so the server skips it next time.
    if (!defaultHidden && hiddenHere) rememberHidden(id);
  }, [defaultHidden, hiddenHere, id]);

  const done = items.filter((i) => i.done).length;
  if (hidden || done === items.length) return null;

  return (
    <section aria-labelledby={`${id}-title`} className="rise relative rounded-xl border border-forest/25 bg-forest-tint p-5">
      <button
        type="button"
        onClick={() => {
          rememberHidden(id);
          setDismissed(true);
        }}
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-md text-muted hover:bg-white/70 hover:text-ink"
      >
        <X aria-hidden className="size-4" />
        <span className="sr-only">Hide “{title}”</span>
      </button>
      <h2 id={`${id}-title`} className="pr-10 text-lg font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted">
        {done} of {items.length} done
      </p>
      <ol className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                item.done ? "bg-forest text-white" : "bg-white text-ink ring-1 ring-line-strong",
              )}
            >
              {item.done ? <Check className="size-3.5" /> : i + 1}
            </span>
            {item.done ? (
              <span className="text-muted line-through decoration-muted/60">
                {item.label}
                <span className="sr-only"> (done)</span>
              </span>
            ) : (
              <AppLink href={item.href} className="font-semibold">
                {item.label}
              </AppLink>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
