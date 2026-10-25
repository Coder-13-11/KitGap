import type { Metadata } from "next";
import { ClipboardList, SearchX } from "lucide-react";
import { OnlineDrives } from "@/components/discover/online-drives";
import { DirectoryFilters } from "@/components/requests/directory-filters";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { CategoryTile } from "@/components/ui/category";
import { cn } from "@/components/ui/cn";
import { Container, EmptyState } from "@/components/ui/layout-bits";
import { Reveal } from "@/components/ui/motion";
import { CATEGORY_LABEL } from "@/domain/phase";
import { CATEGORIES } from "@/domain/request-input";
import { listPublicRequests, type DirectorySort, type DirectoryStatus } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Find a way to help" };

const STATUS_TEXT: Record<DirectoryStatus, string> = {
  open: "still need help",
  in_progress: "are fully taken, closed or past their date",
  completed: "are complete",
  close: "are almost done",
  all: "in any state",
};

const SORTS: DirectorySort[] = ["deadline", "newest", "progress", "almost"];

// Find: every way to help in one place. "On KitGap" lists needs a person
// checked; "Found online" lists drives posted elsewhere, so there is always
// something to help with even while KitGap is new.
export default async function FindPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const tab = one("tab") === "online" ? "online" : "kitgap";
  const q = one("q").slice(0, 100);
  const category = CATEGORIES.includes(one("category") as never) ? one("category") : "all";
  const status = (["open", "in_progress", "completed", "close", "all"].includes(one("status")) ? one("status") : "open") as DirectoryStatus;
  const sort = (SORTS.includes(one("sort") as DirectorySort) ? one("sort") : "deadline") as DirectorySort;

  const ctx = await getAppContext();
  const results = tab === "kitgap" ? await listPublicRequests(ctx, { q, category, status, sort }) : [];
  const filtered = Boolean(q) || category !== "all" || status !== "open";
  const categoryName = category !== "all" ? CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] : null;

  const tabClass = (on: boolean) =>
    cn(
      "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-center font-semibold no-underline sm:flex-none sm:px-5",
      on ? "bg-surface text-forest-dark shadow-card" : "text-ink hover:bg-surface/60",
    );

  return (
    <Container className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-[2.25rem]">Find a way to help</h1>
        <p className="max-w-2xl text-lg text-muted">Pick what you care about. Each need lists exactly what to bring.</p>
      </header>

      <nav aria-label="Kinds of need">
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATEGORIES.map((c) => (
            <li key={c} className="shrink-0">
              <AppLink
                href={`/requests?category=${category === c ? "all" : c}`}
                aria-current={category === c ? "true" : undefined}
                className={cn(
                  "block rounded-xl px-2 py-2 no-underline hover:bg-sunken",
                  category === c && "bg-sunken ring-2 ring-forest",
                )}
              >
                <CategoryTile category={c} />
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>

      <div role="tablist" aria-label="Where to look" className="flex gap-1 rounded-lg bg-sunken p-1 sm:inline-flex">
        <AppLink href={`/requests${category !== "all" ? `?category=${category}` : ""}`} role="tab" aria-selected={tab === "kitgap"} className={tabClass(tab === "kitgap")}>
          On KitGap
        </AppLink>
        <AppLink href="/requests?tab=online" role="tab" aria-selected={tab === "online"} className={tabClass(tab === "online")}>
          Found online
        </AppLink>
      </div>

      {tab === "online" ? (
        <OnlineDrives
          place={one("place").slice(0, 80)}
          topic={one("topic").slice(0, 80)}
          searched={"place" in params || Boolean(one("topic"))}
        />
      ) : (
        <>
          <DirectoryFilters
            q={q}
            category={category}
            status={status}
            sort={sort}
            categories={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
          />
          <section aria-labelledby="results-title" className="space-y-4">
            <h2 id="results-title" className={results.length === 0 ? "sr-only" : "text-base font-semibold text-muted"} aria-live="polite">
              {results.length} {results.length === 1 ? "need" : "needs"} {STATUS_TEXT[status]}
              {categoryName ? ` in ${categoryName}` : ""}
              {q ? ` matching “${q}”` : ""}
            </h2>
            {results.length === 0 ? (
              <EmptyState
                icon={filtered ? <SearchX /> : <ClipboardList />}
                title={filtered ? "Nothing matches that yet" : "No needs posted near you yet"}
                action={
                  <>
                    <ButtonLink href="/requests?tab=online" variant="primary">
                      See drives found online
                    </ButtonLink>
                    <ButtonLink href="/organization/new" variant="secondary">
                      Post a need
                    </ButtonLink>
                  </>
                }
              >
                {filtered
                  ? "Try another kind of need, or look at drives other people posted online."
                  : "KitGap is new here. Look at drives other people posted online, or post your organization's needs."}
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {results.map((summary, i) => (
                  <Reveal as="li" key={summary.request.id} index={i % 3}>
                    <RequestCard summary={summary} />
                  </Reveal>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Container>
  );
}
