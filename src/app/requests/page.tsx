import type { Metadata } from "next";
import { ClipboardList, SearchX } from "lucide-react";
import { DirectoryFilters } from "@/components/requests/directory-filters";
import { RequestCard } from "@/components/requests/request-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Reveal } from "@/components/ui/motion";
import { CATEGORY_LABEL } from "@/domain/phase";
import { CATEGORIES } from "@/domain/request-input";
import { listPublicRequests, type DirectorySort, type DirectoryStatus } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Explore requests" };

const STATUS_TEXT: Record<DirectoryStatus, string> = {
  open: "open for new drives",
  in_progress: "fully taken, closed or past their needed-by date",
  completed: "fulfilled",
  close: "almost finished",
  all: "in any state",
};

const SORTS: DirectorySort[] = ["deadline", "newest", "progress", "almost"];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = one("q").slice(0, 100);
  const category = CATEGORIES.includes(one("category") as never) ? one("category") : "all";
  const status = (["open", "in_progress", "completed", "close", "all"].includes(one("status")) ? one("status") : "open") as DirectoryStatus;
  const sort = (SORTS.includes(one("sort") as DirectorySort) ? one("sort") : "deadline") as DirectorySort;

  const ctx = await getAppContext();
  const results = await listPublicRequests(ctx, { q, category, status, sort });
  const filtered = Boolean(q) || category !== "all" || status !== "open";

  const describe = [
    `${results.length} ${results.length === 1 ? "request" : "requests"} ${STATUS_TEXT[status]}`,
    category !== "all" ? `in ${CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}` : null,
    q ? `matching “${q}”` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Container className="space-y-6">
      <PageHeader
        title="Explore requests"
        description="Real needs from local organizations. Take on a whole request or just part of it."
      />
      <DirectoryFilters
        q={q}
        category={category}
        status={status}
        sort={sort}
        categories={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
      />
      <section aria-labelledby="results-title" className="space-y-4">
        <h2 id="results-title" className="text-base font-semibold text-muted" aria-live="polite">
          {describe}
        </h2>
        {results.length === 0 ? (
          <EmptyState
            icon={filtered ? <SearchX /> : <ClipboardList />}
            title={
              status === "close" && !q && category === "all"
                ? "Nothing is almost finished yet"
                : filtered
                  ? "Nothing matches that yet"
                  : "No requests near you yet"
            }
            action={
              filtered ? (
                <ButtonLink href="/requests" variant="secondary">
                  See all open requests
                </ButtonLink>
              ) : (
                <ButtonLink href="/organization/new" variant="primary">
                  Post what your organization needs
                </ButtonLink>
              )
            }
          >
            {filtered
              ? `No requests ${STATUS_TEXT[status]}${category !== "all" ? ` in ${CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}` : ""}${q ? ` mention “${q}”` : ""}. Try a shorter search or another status.`
              : "When a local organization posts a need and a person checks it, it shows up here."}
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((summary, i) => (
              <Reveal as="li" key={summary.request.id} index={i % 3}>
                <RequestCard summary={summary} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
