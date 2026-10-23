import { BadgeCheck, Plus, Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActivityList } from "@/components/site/activity-list";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { getOrgDashboard } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "My organization" };

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const flags = await searchParams;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/organization/${id}`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getOrgDashboard(ctx, id);
  if (!data) notFound();
  if (data === "not_allowed") {
    return (
      <Container narrow className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold">You're not a member of this organization</h1>
        <p>Ask one of its managers for the invitation link.</p>
      </Container>
    );
  }
  const { org, pendingDeliveries, requests, drives } = data;
  // Organizations post in one timezone; show times in the one their requests use.
  const timezone = requests[0]?.timezone ?? "America/New_York";
  const unresolved = requests.filter((r) => ["open", "fully_committed", "past_due", "closed"].includes(r.phase));
  const drafts = requests.filter((r) => ["draft", "returned", "in_review"].includes(r.phase));
  const finished = requests.filter((r) => ["fulfilled", "cancelled"].includes(r.phase));

  return (
    <Container className="space-y-8">
      {flags.created ? (
        <Notice tone="success" live="polite" title="Your organization is set up">
          Next, post your first request. A KitGap reviewer checks each request, and confirms your contact, before it's listed publicly.
        </Notice>
      ) : null}
      {flags.joined ? (
        <Notice tone="success" live="polite">
          You joined {org.name}. You can now review deliveries and work on requests.
        </Notice>
      ) : null}
      {flags.reviewed ? (
        <Notice tone="success" live="polite" title="Decision saved">
          The group can see your decision, and the request's received total is updated.
        </Notice>
      ) : null}
      {flags.deleted ? (
        <Notice tone="success" live="polite">
          The draft was deleted.
        </Notice>
      ) : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">Receiving organization · {org.city}</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{org.name}</h1>
          {org.contactConfirmedAt ? (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
              <BadgeCheck aria-hidden className="size-4" /> Contact confirmed by a KitGap reviewer
            </p>
          ) : (
            <p className="text-sm text-muted">
              Contact not yet confirmed. A KitGap reviewer will reach {org.contactName || "your contact"} before your first request is listed.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/organization/${org.id}/requests/new`}>
            <Plus aria-hidden className="size-4" /> New request
          </ButtonLink>
          <ButtonLink href={`/organization/${org.id}/settings`} variant="secondary">
            <Settings aria-hidden className="size-4" /> Settings
          </ButtonLink>
        </div>
      </header>

      <Section
        title="Deliveries awaiting your review"
        id="pending"
        description="Confirm what arrived. Only what you accept counts toward your requests."
      >
        {pendingDeliveries.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-3 text-muted">No deliveries are waiting for you.</p>
        ) : (
          <ul className="space-y-3">
            {pendingDeliveries.map((d) => (
              <li key={d.deliveryId} className="flex flex-col gap-3 rounded-lg border-2 border-info/40 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {d.groupName} reported {countNoun(d.quantity, d.unitName)}
                  </p>
                  <p className="text-sm text-muted">
                    For “{d.requestTitle}” · {formatTimestamp(d.submittedAt, timezone)}
                  </p>
                  {d.note ? <p className="mt-1 text-sm">“{d.note}”</p> : null}
                </div>
                <ButtonLink href={`/organization/${org.id}/deliveries/${d.deliveryId}`} className="shrink-0">
                  Review delivery
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Open requests" id="requests">
        {unresolved.length === 0 ? (
          <EmptyState
            title={drafts.length ? "No published requests yet" : "No requests yet"}
            action={<ButtonLink href={`/organization/${org.id}/requests/new`}>Post a request</ButtonLink>}
          >
            Describe exactly what you need, for example 100 school-supply kits with a set list of items.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {unresolved.map((r) => (
              <li key={r.id} className="relative rounded-lg border border-line bg-surface p-4 hover:border-line-strong">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold">
                      <AppLink href={`/organization/${org.id}/requests/${r.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                        {r.title}
                      </AppLink>
                    </h3>
                    {r.totals ? (
                      <p className="tabular text-sm">
                        {countNoun(r.totals.target, r.unitName)} requested · {formatCount(r.totals.promised)} promised ·{" "}
                        {formatCount(r.totals.accepted)} received
                        {r.totals.pendingReview > 0 ? ` · ${formatCount(r.totals.pendingReview)} awaiting your review` : ""}
                      </p>
                    ) : null}
                    {r.neededBy ? (
                      <p className="text-sm text-muted">
                        Needed by {formatCalendarDate(r.neededBy)}
                        {r.deadline ? ` · ${r.deadline.description}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <PhaseBadge phase={r.phase} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {drafts.length > 0 ? (
        <Section title="Drafts and requests under review" id="drafts">
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {drafts.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <AppLink href={`/organization/${org.id}/requests/${r.id}`} className="font-semibold">
                    {r.title}
                  </AppLink>
                  {r.phase === "returned" ? <p className="text-sm text-amber">Reviewer's note: “{r.statusNote}”</p> : null}
                </div>
                <PhaseBadge phase={r.phase} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Drives in progress" id="drives" description="Groups working on your requests. You'll see their deliveries above when they hand items over.">
        {drives.length === 0 ? (
          <p className="text-muted">No groups are running drives for your requests yet.</p>
        ) : (
          <div className="rounded-lg border border-line bg-surface">
            <ul className="divide-y divide-line">
              {drives.map((d) => (
                <li key={d.commitmentId} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold">{d.groupName}</p>
                    <p className="truncate text-sm text-muted">{d.requestTitle}</p>
                  </div>
                  <p className="tabular text-sm">
                    {countNoun(d.quantity, d.unitName)}: {formatCount(d.stages.accepted)} received
                    {d.stages.pendingReview ? `, ${formatCount(d.stages.pendingReview)} awaiting review` : ""}
                    {d.stages.ready ? `, ${formatCount(d.stages.ready)} ready to hand over` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {d.status !== "active" ? <Pill tone="danger">Withdrawn</Pill> : null}
                    {d.deadline.passed && d.stages.accepted < d.quantity ? <Pill tone="amber">Overdue</Pill> : null}
                    <AppLink href={`/drives/${d.commitmentId}`} className="text-sm font-semibold">
                      Details
                    </AppLink>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {finished.length > 0 ? (
        <Section title="Fulfilled and cancelled" id="finished">
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {finished.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <AppLink href={`/organization/${org.id}/requests/${r.id}`} className="font-semibold">
                  {r.title}
                </AppLink>
                <PhaseBadge phase={r.phase} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Recent activity" id="activity">
        <ActivityList items={data.activity} timezone={timezone} showContext />
      </Section>
    </Container>
  );
}
