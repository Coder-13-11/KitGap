"use client";

// Search and filters for the request directory. A plain GET form: the
// filters live in the URL, so Back, reload and shared links keep them.

import { Search } from "lucide-react";
import { useBase, withBase } from "../ui/base";
import { buttonClass } from "../ui/button";
import { inputClass } from "../ui/field";

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
  return (
    <form role="search" action={withBase(base, "/requests")} method="get" className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
        <label htmlFor="q" className="font-semibold">
          Search
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Item, organization or city" className={inputClass(undefined, "pl-9")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="font-semibold">
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
        <label htmlFor="status" className="font-semibold">
          Show
        </label>
        <select id="status" name="status" defaultValue={status} className={inputClass()}>
          <option value="open">Open for new drives</option>
          <option value="in_progress">Fully committed, closed or past due</option>
          <option value="completed">Fulfilled</option>
          <option value="all">All requests</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="font-semibold">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={sort} className={inputClass()}>
          <option value="deadline">Soonest needed</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <button type="submit" className={buttonClass("primary")}>
        Show requests
      </button>
    </form>
  );
}
