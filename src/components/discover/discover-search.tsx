"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useBase, withBase } from "../ui/base";
import { cn } from "../ui/cn";

export function DiscoverSearch({ place, topic, topics }: { place: string; topic: string; topics: string[] }) {
  const router = useRouter();
  const base = useBase();
  const [where, setWhere] = useState(place);
  const [what, setWhat] = useState(topic);
  const [pending, startTransition] = useTransition();

  const go = (nextWhat = what, nextWhere = where) => {
    const sp = new URLSearchParams({ place: nextWhere.trim() });
    if (nextWhat.trim()) sp.set("topic", nextWhat.trim());
    startTransition(() => router.push(withBase(base, `/discover?${sp.toString()}`), { scroll: false }));
  };

  return (
    <div className="max-w-3xl space-y-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_20px_60px_rgb(0_0_0/0.25)] sm:flex-row"
      >
        <label htmlFor="discover-place" className="sr-only">
          City or ZIP code
        </label>
        <div className="relative flex-1">
          <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            id="discover-place"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Your city or ZIP, like Orlando, FL"
            autoComplete="address-level2"
            className="h-13 w-full rounded-xl bg-transparent pr-3 pl-11 text-lg text-ink placeholder:text-muted focus-visible:outline-offset-0"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="press inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-lg font-semibold text-white hover:bg-forest-dark disabled:bg-forest/80"
        >
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Search className="size-5" aria-hidden="true" />}
          {pending ? "Searching" : "Find drives"}
        </button>
      </form>
      <div>
        <p id="topic-label" className="mb-2 text-sm font-semibold text-[#d7e6dc]">
          What do you want to give?
        </p>
        <ul aria-labelledby="topic-label" className="flex flex-wrap gap-2">
          {topics.map((t) => {
            const on = what.toLowerCase() === t.toLowerCase();
            return (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? "" : t;
                    setWhat(next);
                    go(next);
                  }}
                  className={cn(
                    "press min-h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                    on ? "bg-white text-forest ring-white" : "bg-white/10 text-white ring-white/30 hover:bg-white/20",
                  )}
                >
                  {t}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
