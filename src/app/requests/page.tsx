import type { Metadata } from "next";
import { DirectoryFilters } from "@/components/requests/directory-filters";
import { RequestCard } from "@/components/requests/request-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { CATEGORY_LABEL } from "@/domain/phase";
import { CATEGORIES } from "@/domain/request-input";
import { listPublicRequests, type DirectorySort, type DirectoryStatus } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Explore requests" };

const STATUS_TEXT: Record<DirectoryStatus, string> = {
  open: "open for new drives",
  in_progress: "fully committed, closed or past their needed-by date",
  completed: "fulfilled",
  all: "in any state",
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = one("q").slice(0, 100);
  const category = CATEGORIES.includes(one("category") as never) ? one("category") : "all";
  const status = (["open", "in_progress", "completed", "all"].includes(one("status")) ? one("status") : "open") as DirectoryStatus;
  const sort = (one("sort") === "newest" ? "newest" : "deadline") as DirectorySort;

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
        description="Organizations post exactly what they need. Your group can take on all of a request or part of it."
      />
      <DirectoryFilters
        q={q}
        category={category}
        status={status}
        sort={sort}
        categories={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
      />
      <section aria-labelledby="results-title" className="space-y-4">
        <h2 id="results-title" className="text-base font-semibold text-muted">
          {describe}
        </h2>
        {results.length === 0 ? (
          <EmptyState
            title={filtered ? "No requests match these filters" : "No open requests right now"}
            action={
              filtered ? (
                <ButtonLink href="/requests" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : (
                <ButtonLink href="/organization/new" variant="secondary">
                  Post a request for your organization
                </ButtonLink>
              )
            }
          >
            {filtered
              ? `You're viewing requests ${STATUS_TEXT[status]}${category !== "all" ? ` in ${CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}` : ""}${q ? ` that mention “${q}”` : ""}. Try fewer words or a different filter.`
              : "When an organization's request is approved, it appears here."}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((summary) => (
              <li key={summary.request.id}>
                <RequestCard summary={summary} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
