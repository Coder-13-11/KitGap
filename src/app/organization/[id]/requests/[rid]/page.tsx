import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConfirmWithNote, EditDetailsForm, PostUpdateForm, SimpleActionButton } from "@/components/requests/manage-forms";
import { AskKitCard } from "@/components/kit/ask-kit-card";
import { ActivityList } from "@/components/site/activity-list";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { RequestProgress } from "@/components/ui/progress";
import { PhaseBadge } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { PHASE_EXPLANATION } from "@/domain/phase";
import { countNoun, formatCount, listPhrase } from "@/domain/text";
import { getOrgRequest } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Manage request" };

export default async function ManageRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; rid: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id, rid } = await params;
  const flags = await searchParams;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/organization/${id}/requests/${rid}`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getOrgRequest(ctx, id, rid);
  if (!data) notFound();
  if (data === "not_allowed") redirect(`${ctx.base}/organization/${id}`);
  const { request, components, totals, phase, role } = data;
  const isAdmin = role === "admin";
  const hidden = { requestId: request.id, orgId: id };
  const live = request.status === "published" || request.status === "closed";
  const recipe = request.requestType === "kit" ? listPhrase(components.map((c) => countNoun(c.quantityPerUnit, c.name))) : request.unitName;

  return (
    <Container className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}`}>← {data.orgName}</AppLink>
      </nav>

      {flags.submitted ? (
        <Notice tone="success" live="polite" title="Submitted for review">
          A KitGap reviewer will check your request. It's listed publicly once it's approved; you'll see the status change here.
        </Notice>
      ) : null}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={phase} />
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{request.title}</h1>
        <p className="text-muted">{PHASE_EXPLANATION[phase]}</p>
        {request.targetQuantity ? (
          <p>
            {countNoun(request.targetQuantity, request.unitName)}
            {request.requestType === "kit" ? `, each with ${recipe}` : ""}
            {request.neededBy ? ` · needed by ${formatCalendarDate(request.neededBy)}` : ""}
            {data.deadline && live ? ` (${data.deadline.description.toLowerCase()})` : ""}
          </p>
        ) : null}
      </header>

      {request.status === "draft" ? (
        <Panel className="space-y-3">
          {request.statusNote ? (
            <Notice tone="warning" title="A KitGap reviewer asked for changes">
              “{request.statusNote}”
            </Notice>
          ) : null}
          <p>This draft is only visible to {data.orgName}.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/organization/${id}/requests/${rid}/edit`}>Continue editing</ButtonLink>
            <ConfirmWithNote
              kind="delete"
              hidden={hidden}
              buttonLabel="Delete draft"
              title="Delete this draft?"
              description={<p>The draft will be removed. This can't be undone.</p>}
              confirmLabel="Delete draft"
              danger
            />
          </div>
        </Panel>
      ) : null}

      {request.status === "in_review" ? (
        <Panel className="space-y-3">
          <p>
            Submitted {request.submittedAt ? formatTimestamp(request.submittedAt, request.timezone) : ""}. A KitGap reviewer will approve it or
            send it back with a note.
          </p>
          <SimpleActionButton action="withdrawReview" hidden={hidden} label="Take it back to edit" pendingLabel="Moving to draft…" />
        </Panel>
      ) : null}

      {totals && live ? (
        <Panel as="section" className="space-y-3">
          <h2 className="text-lg font-semibold">Progress</h2>
          <p>
            {formatCount(totals.promised)} of {countNoun(totals.target, request.unitName)} promised; {formatCount(totals.accepted)} confirmed
            received{totals.pendingReview ? `; ${formatCount(totals.pendingReview)} awaiting your review` : ""}.
          </p>
          <RequestProgress totals={totals} unitName={request.unitName} />
          <p className="flex flex-wrap gap-x-4 text-sm">
            <AppLink href={`/requests/${rid}`} className="font-semibold">
              View the public page
            </AppLink>
          </p>
        </Panel>
      ) : null}

      {request.status === "published" ? <AskKitCard requestId={rid} /> : null}

      {data.pendingDeliveries.length > 0 ? (
        <Section title="Deliveries awaiting your review" id="pending">
          <ul className="space-y-2">
            {data.pendingDeliveries.map((d) => (
              <li key={d.deliveryId} className="flex flex-col gap-2 rounded-lg border-2 border-info/40 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <span className="font-semibold">{d.groupName}</span> reported {countNoun(d.quantity, d.unitName)} ·{" "}
                  {formatTimestamp(d.submittedAt, request.timezone)}
                </p>
                <ButtonLink href={`/organization/${id}/deliveries/${d.deliveryId}`}>Review delivery</ButtonLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {live || request.status === "cancelled" ? (
        <Section title="Drives" id="drives">
          {data.drives.length === 0 ? (
            <p className="text-muted">No group has started a drive yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {data.drives.map((d) => (
                <li key={d.commitmentId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                  <AppLink href={`/drives/${d.commitmentId}`} className="font-semibold">
                    {d.groupName}
                  </AppLink>
                  <span className="tabular text-sm">
                    {countNoun(d.quantity, d.unitName)} · {formatCount(d.stages.accepted)} received
                    {d.stages.pendingReview ? ` · ${formatCount(d.stages.pendingReview)} awaiting review` : ""}
                    {d.status !== "active" ? " · withdrawn" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {live && isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="New drives" id="status">
            <Panel className="space-y-3">
              {request.status === "published" ? (
                <>
                  <p>Stop new groups from adopting this request. Groups already running drives can still deliver.</p>
                  <ConfirmWithNote
                    kind="close"
                    hidden={hidden}
                    buttonLabel="Close to new drives"
                    title="Close to new drives?"
                    description={<p>Groups with drives keep going and can still deliver. You can reopen the request later.</p>}
                    noteLabel="Note shown on the request"
                    noteHint="For example, “We have enough groups for now”"
                    confirmLabel="Close to new drives"
                  />
                </>
              ) : (
                <>
                  <p>New drives are closed{request.statusNote ? `: “${request.statusNote}”` : "."}</p>
                  <SimpleActionButton action="reopen" hidden={hidden} label="Reopen to new drives" pendingLabel="Reopening…" />
                </>
              )}
            </Panel>
          </Section>
          <Section title="Quantity and items" id="requirements">
            <Panel className="space-y-3">
              {data.hasAnyDrive ? (
                <>
                  <p>
                    Groups have committed to this quantity and these items, so they can't change here. To ask for something different, copy
                    this request into a new draft.
                  </p>
                  <SimpleActionButton action="copy" hidden={hidden} label="Copy into a new request" pendingLabel="Copying…" />
                </>
              ) : (
                <>
                  <p>No group has started a drive yet, so you can move this request back to draft to change it. It will need review again.</p>
                  <SimpleActionButton action="unpublish" hidden={hidden} label="Move back to draft" pendingLabel="Moving…" />
                </>
              )}
            </Panel>
          </Section>
        </div>
      ) : null}

      {live || request.status === "cancelled" ? (
        <Section title="Post an update" id="update">
          <Panel>
            <PostUpdateForm requestId={rid} />
          </Panel>
        </Section>
      ) : null}

      {live && isAdmin ? (
        <Section title="Edit details" id="details" description="Descriptions and handover details can change at any time; groups running drives see the changes.">
          <Panel>
            <EditDetailsForm
              requestId={rid}
              values={{
                need: request.need,
                beneficiaries: request.beneficiaries,
                conditionNotes: request.conditionNotes,
                substitutions: request.substitutions,
                location: request.location,
                handoverInstructions: request.handoverInstructions,
                coordinatorContact: request.coordinatorContact,
                fundraisingUrl: request.fundraisingUrl ?? "",
              }}
            />
          </Panel>
        </Section>
      ) : null}

      {live && isAdmin ? (
        <Section title="Cancel this request" id="cancel">
          <Panel className="space-y-3">
            <p>
              Cancel only if you no longer need these items. Every drive, delivery and decision stays on record, deliveries already reported
              can still be reviewed, and groups are told why.
            </p>
            <ConfirmWithNote
              kind="cancel"
              hidden={hidden}
              buttonLabel="Cancel request"
              title="Cancel this request?"
              description={
                <ul className="list-disc space-y-1 pl-5">
                  <li>No new drives can start and groups can't report new deliveries.</li>
                  <li>Deliveries already reported stay in your review list.</li>
                  <li>Groups see your explanation on their drive page.</li>
                </ul>
              }
              noteLabel="Explanation for the groups"
              noteRequired
              confirmLabel="Cancel request"
              danger
            />
          </Panel>
        </Section>
      ) : null}

      {request.status === "cancelled" ? (
        <Notice tone="error" title="Cancelled">
          “{request.statusNote}”
        </Notice>
      ) : null}

      <Section title="Activity" id="activity">
        <ActivityList items={data.activity} timezone={request.timezone} />
      </Section>
    </Container>
  );
}
