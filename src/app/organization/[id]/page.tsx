import { BadgeCheck, CheckCircle2, Inbox, PackageCheck, Plus, Settings, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActivityList } from "@/components/site/activity-list";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { RequestProgress } from "@/components/ui/progress";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { getOrgDashboard } from "@/server/queries/organization";
import { getConfirmedReceipts } from "@/server/queries/records";
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
  const receipts = await getConfirmedReceipts(ctx, id);
  const receiptList = receipts && receipts !== "not_allowed" ? receipts : [];
  // Organizations post in one timezone; show times in the one their requests use.
  const timezone = requests[0]?.timezone ?? "America/New_York";
  const unresolved = requests.filter((r) => ["open", "fully_committed", "past_due", "closed"].includes(r.phase));
  const drafts = requests.filter((r) => ["draft", "returned", "in_review"].includes(r.phase));
  const returned = drafts.filter((r) => r.phase === "returned");
  const finished = requests.filter((r) => ["fulfilled", "cancelled"].includes(r.phase));
  const inboxCount = pendingDeliveries.length + returned.length;
  const receiptUnits = new Set(receiptList.map((r) => r.unitName.toLowerCase()));
  const confirmedTotal =
    receiptUnits.size === 1 ? countNoun(receiptList.reduce((sum, r) => sum + r.accepted, 0), receiptList[0].unitName) : null;
  const activeDrives = drives.filter((d) => d.status === "active").length;

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
          <ButtonLink href={`/record/organization/${org.id}`} variant="secondary">
            Confirmed record
          </ButtonLink>
          <ButtonLink href={`/organization/${org.id}/settings`} variant="secondary">
            <Settings aria-hidden className="size-4" /> Settings
          </ButtonLink>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Need your review", value: inboxCount, href: "#pending", strong: inboxCount > 0 },
          { label: "Groups collecting for you", value: activeDrives, href: "#drives", strong: false },
          { label: receiptList.length === 1 ? "Delivery confirmed" : "Deliveries confirmed", value: receiptList.length, href: "#receipts", strong: false },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`flex flex-col rounded-xl border px-4 py-3 ${stat.strong ? "border-info/50 bg-info-tint" : "border-line bg-surface"}`}
          >
            <dt className="order-2 text-sm text-muted">
              <a href={stat.href} className="text-inherit no-underline hover:underline">
                {stat.label}
              </a>
            </dt>
            <dd className="tabular order-1 font-serif text-3xl leading-tight font-semibold">{formatCount(stat.value)}</dd>
          </div>
        ))}
      </dl>

      <Section title="Needs your review" id="pending" description="Confirm what arrived. Only what you accept counts toward your requests.">
        {inboxCount === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-4">
            <CheckCircle2 aria-hidden className="size-6 shrink-0 text-forest" />
            <div>
              <p className="font-semibold">You're all caught up</p>
              <p className="text-sm text-muted">No deliveries are waiting for you. When a group hands kits over, they show up here to confirm.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {pendingDeliveries.map((d) => (
              <li key={d.deliveryId} className="flex flex-col gap-3 border-l-4 border-l-info p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Inbox aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {d.groupName} handed over {countNoun(d.quantity, d.unitName)}
                    </p>
                    <p className="text-sm text-muted">
                      For “{d.requestTitle}” · {formatTimestamp(d.submittedAt, timezone)}
                    </p>
                    {d.note ? <p className="mt-1 text-sm">“{d.note}”</p> : null}
                  </div>
                </div>
                <ButtonLink href={`/organization/${org.id}/deliveries/${d.deliveryId}`} className="shrink-0">
                  Review delivery
                </ButtonLink>
              </li>
            ))}
            {returned.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 border-l-4 border-l-amber p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Undo2 aria-hidden className="mt-0.5 size-5 shrink-0 text-amber" />
                  <div className="min-w-0">
                    <p className="font-semibold">A reviewer asked for changes to “{r.title}”</p>
                    {r.statusNote ? <p className="text-sm text-muted">“{r.statusNote}”</p> : null}
                  </div>
                </div>
                <ButtonLink href={`/organization/${org.id}/requests/${r.id}`} variant="secondary" className="shrink-0">
                  Fix and resubmit
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your requests" id="requests">
        {unresolved.length === 0 && drafts.length === 0 ? (
          <EmptyState title="No requests yet" action={<ButtonLink href={`/organization/${org.id}/requests/new`}>Post a request</ButtonLink>}>
            Start from a template, for example a school-supply kit, and change it to match exactly what you need.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {[...unresolved, ...drafts].map((r) => (
              <li key={r.id} className="relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 font-semibold">
                    <AppLink href={`/organization/${org.id}/requests/${r.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                      {r.title}
                    </AppLink>
                  </h3>
                  <PhaseBadge phase={r.phase} />
                </div>
                {r.totals && unresolved.includes(r) ? (
                  <>
                    <RequestProgress totals={r.totals} unitName={r.unitName} compact />
                    <p className="tabular text-sm">
                      {countNoun(r.totals.target, r.unitName)} requested
                      {r.totals.pendingReview > 0 ? (
                        <span className="font-semibold text-info"> · {formatCount(r.totals.pendingReview)} awaiting your review</span>
                      ) : null}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {r.phase === "in_review"
                      ? "A KitGap reviewer is checking it. It goes live once approved."
                      : r.phase === "returned"
                        ? "Sent back with a note. Fix it and resubmit."
                        : "Draft. Only your organization can see it."}
                  </p>
                )}
                {r.neededBy ? (
                  <p className="text-sm text-muted">
                    Needed by {formatCalendarDate(r.neededBy)}
                    {r.deadline && unresolved.includes(r) ? ` · ${r.deadline.description}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Kits you've confirmed" id="receipts" description="Your record of what arrived. This list is only for your organization.">
        {receiptList.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-muted">
            Nothing confirmed yet. When you accept a delivery, it&apos;s recorded here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <p className="flex items-center gap-2 border-b border-line bg-forest-tint px-4 py-2.5 text-sm font-semibold text-forest">
              <PackageCheck aria-hidden className="size-4" />
              {confirmedTotal ? `${confirmedTotal} confirmed in total, from ` : "Confirmed from "}
              {countNoun(receiptList.length, "delivery")}
            </p>
            <ul className="divide-y divide-line">
              {receiptList.map((receipt) => (
                <li key={receipt.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                  <div className="min-w-0">
                    <p className="font-semibold">{receipt.groupName}</p>
                    <p className="text-sm text-muted">{receipt.requestTitle}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="tabular font-semibold">{countNoun(receipt.accepted, receipt.unitName)}</p>
                    <p className="text-sm text-muted">{formatTimestamp(receipt.reviewedAt, timezone)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Drives in progress" id="drives" description="Groups working on your requests. Their deliveries appear under Needs your review.">
        {drives.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-muted">
            No groups are running drives for your requests yet. Once a request is listed, school clubs and community groups can adopt part of it.
          </p>
        ) : (
          <div className="rounded-xl border border-line bg-surface">
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
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
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
