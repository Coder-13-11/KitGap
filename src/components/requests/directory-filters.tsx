"use client";

// Search and filters for the request directory. A plain GET form: the
// filters live in the URL, so Back, reload and shared links keep them.
// On a phone the filters open as a bottom sheet. On a wide screen they sit
// under the search field.

import { useEffect, useId, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppLink, useBase, withBase } from "../ui/base";
import { buttonClass } from "../ui/button";
import { cn } from "../ui/cn";
import { inputClass } from "../ui/field";

export const STATUS_CHIPS = [
  { value: "open", label: "Open now" },
  { value: "close", label: "Almost finished" },
  { value: "completed", label: "Fulfilled" },
  { value: "in_progress", label: "Fully taken or closed" },
  { value: "all", label: "Everything" },
] as const;

export function DirectoryFilters({
  q,
  category,
  status,
  sort,
  categories,
}: {
  q: string;
  category: string;
  status: string;
  sort: string;
  categories: { value: string; label: string }[];
}) {
  const base = useBase();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const extras = Number(category !== "all") + Number(sort !== "deadline") + Number(status !== "open");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const chipHref = (value: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category !== "all") sp.set("category", category);
    if (sort !== "deadline") sp.set("sort", sort);
    if (value !== "open") sp.set("status", value);
    const qs = sp.toString();
    return qs ? `/requests?${qs}` : "/requests";
  };

  const fields = (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-semibold">
          Category
        </label>
        <select id="category" name="category" defaultValue={category} className={inputClass()}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="text-sm font-semibold">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={sort} className={inputClass()}>
          <option value="deadline">Soonest needed</option>
          <option value="almost">Almost finished</option>
          <option value="progress">Most confirmed</option>
          <option value="newest">Newest</option>
        </select>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <form role="search" action={withBase(base, "/requests")} method="get" className="tag-shape border border-line-strong bg-surface p-3 shadow-card sm:p-4">
        <input type="hidden" name="status" value={status} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-60">
            <label htmlFor="q" className="sr-only">
              Search requests
            </label>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search items, organizations or cities"
                className={inputClass(undefined, "min-h-12 pl-11 text-base")}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="request-filters"
            className={cn(buttonClass("secondary"), "min-h-12 gap-2 lg:hidden")}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {extras > 0 ? <span className="tabular">({extras})</span> : null}
          </button>
          <button type="submit" className={cn(buttonClass("primary"), "min-h-12")}>
            Search
          </button>
        </div>

        <div
          id="request-filters"
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-labelledby={open ? titleId : undefined}
          className={cn(
            "grid gap-4 lg:mt-4 lg:grid-cols-2",
            open
              ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[14px] border border-b-0 border-line-strong bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card lg:static lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
              : "max-lg:hidden",
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <h2 id={titleId} className="font-serif text-2xl font-semibold">
              Filters
            </h2>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className={buttonClass("quiet", "sm")}>
              Close
            </button>
          </div>
          {fields}
          <fieldset className="mt-4 lg:hidden">
            <legend className="text-sm font-semibold">Status</legend>
            <ul className="mt-2 flex flex-wrap gap-2">
              {STATUS_CHIPS.map((chip) => {
                const current = chip.value === status;
                return (
                  <li key={chip.value}>
                    <AppLink
                      href={chipHref(chip.value)}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-[2px_8px_8px_2px] border px-3 text-sm font-semibold no-underline",
                        current ? "border-forest bg-forest text-white" : "border-line-strong bg-surface text-ink",
                      )}
                    >
                      {chip.label}
                    </AppLink>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <button type="submit" className={cn(buttonClass("primary", "md", true), "mt-5 lg:hidden")}>
            Show requests
          </button>
        </div>

        {open ? (
          <button type="button" aria-label="Close filters" className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />
        ) : null}
      </form>

      <nav aria-label="Request status" className="hidden lg:block">
        <ul className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const current = chip.value === status;
            return (
              <li key={chip.value}>
                <AppLink
                  href={chipHref(chip.value)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-[2px_8px_8px_2px] border px-3 text-sm font-semibold no-underline",
                    current ? "border-forest bg-forest text-white" : "border-line-strong bg-surface text-ink hover:bg-forest-tint",
                  )}
                >
                  {chip.label}
                </AppLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
