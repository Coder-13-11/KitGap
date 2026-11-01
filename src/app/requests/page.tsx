import type { Metadata } from "next";
import { ArrowRight, HeartHandshake, SearchX } from "lucide-react";
import { OnlineDrives } from "@/components/discover/online-drives";
import { DirectoryFilters } from "@/components/requests/directory-filters";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon, CATEGORY_SHORT } from "@/components/ui/category";
import { cn } from "@/components/ui/cn";
import { Container, EmptyState } from "@/components/ui/layout-bits";
import { CATEGORY_LABEL } from "@/domain/phase";
import { CATEGORIES } from "@/domain/request-input";
import { listPublicRequests, type DirectorySort, type DirectoryStatus } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
export const metadata: Metadata = { title: "Needs near you" };
const SORTS: DirectorySort[] = ["deadline", "newest", "progress", "almost"];
export default async function NeedsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const online = one("tab") === "online";
  const q = one("q").slice(0, 100);
  const category = CATEGORIES.includes(one("category") as never) ? one("category") : "all";
  const status = (["open", "in_progress", "completed", "close", "all"].includes(one("status")) ? one("status") : "open") as DirectoryStatus;
  const sort = SORTS.includes(one("sort") as DirectorySort) ? one("sort") as DirectorySort : "deadline";
  const ctx = await getAppContext();
  const results = online ? [] : await listPublicRequests(ctx, { q, category, status, sort });
  const filtered = Boolean(q) || category !== "all" || status !== "open";
  const categoryHref = (value: string) => {
    const sp = new URLSearchParams({ category: value, status, sort });
    if (q) sp.set("q", q);
    return `/requests?${sp}`;
  };
  const tabClass = (on: boolean) =>
    cn("flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-center font-semibold no-underline sm:flex-none sm:px-5", on ? "bg-surface text-forest-dark shadow-card" : "text-ink hover:bg-surface/60");
  return <Container className="space-y-8 sm:space-y-10">
    <header className="grid gap-6 border-b border-line pb-8 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <h1 className="max-w-[16ch] font-serif text-[2.25rem] leading-[1.08] font-bold tracking-[-0.035em] sm:text-6xl">Small things.<br /><span className="text-forest">Real help.</span></h1>
        <p className="mt-4 max-w-lg text-lg text-muted">Your community needs a few things.<br className="hidden sm:block" /> Find one you can bring.</p>
      </div>
      <div className="hidden max-w-xs rounded-2xl bg-sun md:block p-5 text-ink">
        <HeartHandshake className="mb-3 size-7" aria-hidden />
        <p className="font-serif text-lg font-semibold">A little goes a long way.</p>
        <p className="mt-1 text-sm">Choose exactly what’s needed. See it confirmed when it arrives.</p>
        <AppLink href="/organization/new" className="mt-3 inline-flex min-h-12 items-center gap-2 font-semibold text-ink">Post a need <ArrowRight className="size-4" aria-hidden /></AppLink>
      </div>
    </header>
    <section aria-labelledby="needs-title" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="needs-title" className="font-serif text-2xl font-semibold">{online ? "Drives found elsewhere" : "Needs near you"}</h2>
        {ctx.mode === "demo" ? <span className="text-sm font-semibold text-muted">Sample community · fictional needs</span> : <AppLink href="/demo" className="inline-flex min-h-12 items-center text-sm">Try a sample community</AppLink>}
      </div>
      <div role="tablist" aria-label="Where to look" className="flex gap-1 rounded-lg bg-sunken p-1 sm:inline-flex">
        <AppLink href={`/requests${category !== "all" ? `?category=${category}` : ""}`} role="tab" aria-selected={!online} className={tabClass(!online)}>On KitGap</AppLink>
        <AppLink href="/requests?tab=online" role="tab" aria-selected={online} className={tabClass(online)}>Discover</AppLink>
      </div>
      {online ? <><p className="text-muted">Drives posted elsewhere online. These listings have not been reviewed by KitGap.</p><OnlineDrives place={one("place").slice(0,80)} topic={one("topic").slice(0,80)} searched={"place" in params || Boolean(one("topic"))} /></> : <>
        <nav aria-label="Kinds of need"><ul className="flex flex-wrap gap-2">
          <li><AppLink href={categoryHref("all")} aria-current={category === "all" ? "true" : undefined} className={cn("inline-flex min-h-12 items-center rounded-full border px-4 font-semibold no-underline", category === "all" ? "border-forest bg-forest text-white" : "border-line bg-surface text-ink")}>All needs</AppLink></li>
          {CATEGORIES.map(c => <li key={c}><AppLink href={categoryHref(category === c ? "all" : c)} aria-current={category === c ? "true" : undefined} className={cn("inline-flex min-h-12 items-center gap-2 rounded-full border px-4 font-semibold no-underline hover:border-forest",category === c ? "border-forest bg-forest text-white" : "border-line bg-surface text-ink")}><CategoryIcon category={c} className="size-4" />{CATEGORY_SHORT[c]}</AppLink></li>)}
        </ul></nav>
        <DirectoryFilters q={q} category={category} status={status} sort={sort} categories={CATEGORIES.map(c=>({value:c,label:CATEGORY_LABEL[c]}))} />
        <p className="text-sm text-muted" aria-live="polite">{results.length} {results.length === 1 ? "need" : "needs"}{q ? ` matching “${q}”` : ""} · Bring only what’s listed.</p>
        {results.length ? <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map(summary => <li key={summary.request.id}><RequestCard summary={summary} /></li>)}</ul> :
          <EmptyState icon={<SearchX />} title={filtered ? "Nothing matches just yet" : "Be the first to bring your community together"} action={<><ButtonLink href={filtered ? "/requests" : "/organization/new"}>{filtered ? "Clear filters" : "Post a need"}</ButtonLink><ButtonLink href="/demo" variant="secondary">Explore sample needs</ButtonLink></>}>
            {filtered ? "Try another item, city, or category." : "When local organizations post a need, you’ll find exactly what to bring here."}
          </EmptyState>}
      </>}
    </section>
    <section className="flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-serif text-xl font-semibold">Better, together.</h2><p className="mt-1 text-muted">One shared list for your club. Every contribution accounted for.</p></div>
      <ButtonLink href="/drives/new" variant="secondary">Organize a drive <ArrowRight className="size-4" aria-hidden /></ButtonLink>
    </section>
  </Container>;
}

