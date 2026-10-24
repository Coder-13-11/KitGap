import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { MarkUpdatesSeen } from "@/components/site/mark-seen";
import { AppLink } from "@/components/ui/base";
import { Container, EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { formatTimestamp } from "@/domain/dates";
import { getUpdates } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Updates" };

export default async function UpdatesPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/updates${ctx.sessionExpired ? "&expired=1" : ""}`);
  const { items } = await getUpdates(ctx);
  return (
    <Container narrow className="space-y-6">
      <MarkUpdatesSeen />
      <PageHeader title="Updates" description="What other people did in your groups and organizations." />
      {items.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          icon={<Bell />}
          action={
            <AppLink
              href="/requests"
              className="press inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 font-semibold no-underline hover:bg-sunken"
            >
              Find a drive to join
            </AppLink>
          }
        >
          When someone pledges, delivers or confirms supplies in one of your groups or organizations, you&apos;ll see it here.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3">
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${item.unread ? "bg-clay" : "bg-transparent"}`} />
              <div className="min-w-0">
                <p>
                  {item.unread ? <span className="sr-only">New: </span> : null}
                  <span className="font-semibold">{item.actorName}</span> {item.text}
                </p>
                <p className="text-sm text-muted">
                  {item.link ? (
                    <AppLink href={item.link} className="font-semibold">
                      {item.context}
                    </AppLink>
                  ) : (
                    item.context
                  )}
                  {" · "}
                  {formatTimestamp(item.createdAt, "America/New_York")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
