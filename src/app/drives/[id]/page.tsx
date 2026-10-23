import { ClipboardList, FileDown, Printer } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  CancelDeliveryButton,
  ChangeQuantityForm,
  ClosePledgeButton,
  DeliveryForm,
  FollowUpForms,
  PackForm,
  PledgeForm,
  RecordCollectionForm,
  UnpackForm,
  VoidEntryButton,
  WithdrawDrive,
} from "@/components/drives/drive-forms";
import { StageSummary } from "@/components/drives/stages";
import { SuppliesTable } from "@/components/drives/supplies";
import { ActivityList } from "@/components/site/activity-list";
import { AppLink } from "@/components/ui/base";
import { CopyLink } from "@/components/ui/copy-link";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { getDriveWorkspace, type PledgeView } from "@/server/queries/drives";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

export const metadata: Metadata = { title: "Drive" };

const NEXT_ANCHOR: Partial<Record<string, { href: string; label: string }>> = {
  follow_up: { href: "#follow-up", label: "Go to kits not accepted" },
  deliver: { href: "#deliver", label: "Go to report a delivery" },
  pack: { href: "#pack", label: "Go to pack kits" },
  record: { href: "#record", label: "Go to record received supplies" },
  share: { href: "#share", label: "Go to share and invite" },
};

const PLEDGE_STATUS: Record<PledgeView["status"], string> = {
  waiting: "Waiting to arrive",
  partly_received: "Partly received",
  received: "Received",
  withdrawn: "Withdrawn",
  released: "Closed by coordinator",
};

export default async function DrivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const flags = await searchParams;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/drives/${id}`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const drive = await getDriveWorkspace(ctx, id);
  if (!drive) notFound();
  if (drive === "not_allowed") {
    return (
      <Container narrow className="space-y-4">
        <h1 className="font-serif text-3xl font-semibold">You're not part of this drive</h1>
        <p>Only members of the group running it can see this page. If you were sent a link to join, use that invitation link.</p>
        <p>
          <AppLink href={`/d/${id}`} className="font-semibold">See the public page for this drive</AppLink>
        </p>
      </Container>
    );
  }

  const { request, progress, role, commitment, org, group } = drive;
  const unit = request.unitName;
  const units = pluralize(unit).toLowerCase();
  const isKit = request.requestType === "kit";
  const isCoordinator = role === "coordinator";
  const isGroupMember = role !== "organization";
  const active = commitment.status === "active";
  const canChange = active && ["published", "closed"].includes(request.status);
  const { stages } = progress;
  const minimum = Math.max(1, stages.accepted + stages.pendingReview + stages.needsFollowUp + (isKit ? stages.ready : 0));
  const maximum = commitment.quantity + (drive.phase === "open" ? drive.requestAvailable : 0);
  const publicUrl = `${siteUrl()}${ctx.base}/d/${commitment.id}`;
  const inviteUrl = group.inviteToken ? `${siteUrl()}${ctx.base}/join/${group.inviteToken}` : null;
  const openPledges = drive.pledges.filter((p) => p.outstanding > 0);
  const pending = drive.deliveries.filter((d) => d.status === "submitted");

  return (
    <Container className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-4 text-sm">
        <AppLink href="/drives">← My drives</AppLink>
        <AppLink href={`/requests/${request.id}`}>View the request</AppLink>
      </nav>

      {flags.started ? (
        <Notice tone="success" live="polite" title="Your drive has started">
          {countNoun(commitment.quantity, unit)} {commitment.quantity === 1 ? "is" : "are"} reserved for {group.name}. Next, share the supply
          list with your group and invite members to pledge.
        </Notice>
      ) : null}

      <header className="space-y-3">
        <p className="text-sm font-semibold text-muted">
          {group.name} · drive for {org.name}
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{request.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {active ? <Pill tone="forest">Drive active</Pill> : <Pill tone="danger">Withdrawn</Pill>}
          <PhaseBadge phase={drive.phase} />
          {role === "organization" ? <Pill tone="info">Viewing as the receiving organization</Pill> : null}
          {role === "contributor" ? <Pill>You're a member</Pill> : null}
        </div>
        <dl className="grid gap-3 text-[0.95rem] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">Commitment</dt>
            <dd className="font-semibold">{countNoun(commitment.quantity, unit)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Needed by</dt>
            <dd className="font-semibold">{request.neededBy ? formatCalendarDate(request.neededBy) : "Not set"}</dd>
            {drive.deadline.description && stages.accepted < commitment.quantity ? (
              <dd className={drive.deadline.passed ? "text-sm font-semibold text-amber" : "text-sm text-muted"}>
                {drive.deadline.passed ? `Overdue: ${drive.deadline.description.toLowerCase()}` : drive.deadline.description}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-sm text-muted">Receiving organization</dt>
            <dd className="font-semibold">{org.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{drive.coordinators.length === 1 ? "Coordinator" : "Coordinators"}</dt>
            <dd className="font-semibold">{drive.coordinators.join(", ")}</dd>
          </div>
        </dl>
      </header>

      {!active ? (
        <Notice tone="warning" title="This drive was withdrawn">
          {commitment.withdrawNote ? <p>“{commitment.withdrawNote}”</p> : null}
          <p>
            {stages.accepted > 0 ? `${countNoun(stages.accepted, unit)} delivered earlier still count. ` : ""}
            {stages.pendingReview > 0 ? `${countNoun(stages.pendingReview, unit)} are still awaiting ${org.name}'s review.` : ""}
          </p>
        </Notice>
      ) : null}
      {request.status === "cancelled" ? (
        <Notice tone="error" title={`${org.name} cancelled this request`}>
          <p>“{request.statusNote}”</p>
          <p>No new deliveries can be reported. Deliveries already reported can still be reviewed, and everything stays on record.</p>
        </Notice>
      ) : request.status === "closed" ? (
        <Notice tone="info" title={`${org.name} closed this request to new drives`}>
          {request.statusNote ? <p>“{request.statusNote}”</p> : null}
          <p>Your drive continues as planned.</p>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          {isCoordinator ? (
            <>
          {isCoordinator ? (
            <Panel tone="forest" className="space-y-2">
              <p className="text-sm font-semibold text-forest-dark">Next step</p>
              <h2 className="text-xl font-semibold">{drive.nextStep.title}</h2>
              {drive.nextStep.detail ? <p>{drive.nextStep.detail}</p> : null}
              {NEXT_ANCHOR[drive.nextStep.action] ? (
                <p>
                  <a href={NEXT_ANCHOR[drive.nextStep.action]!.href} className="font-semibold">
                    {NEXT_ANCHOR[drive.nextStep.action]!.label}
                  </a>
                </p>
              ) : null}
            </Panel>
          ) : null}

          <Section title={isKit ? "Kits" : "Items"} id="stages">
            <Panel>
              <StageSummary stages={stages} committed={commitment.quantity} requestType={request.requestType} unitName={unit} />
            </Panel>
          </Section>

          <Section title="Supplies" id="supplies" description={drive.bottleneck.headline}>
            <Panel className="space-y-2">
              {drive.bottleneck.detail ? <p className="text-[0.95rem]">{drive.bottleneck.detail}</p> : null}
              {isKit && progress.supportedByCollected > 0 ? (
                <p className="text-sm text-muted">
                  The usable supplies collected so far make {countNoun(progress.supportedByCollected, unit)} in total, counting{" "}
                  {formatCount(stages.built)} already packed.
                </p>
              ) : null}
              <SuppliesTable components={progress.components} committed={commitment.quantity} unitName={unit} requestType={request.requestType} />
            </Panel>
          </Section>

          {isCoordinator && active ? (
            <Section title="Record received supplies" id="record" description="Count only what has physically arrived. Check each item and record anything unusable separately.">
              <Panel>
                <RecordCollectionForm
                  commitmentId={commitment.id}
                  components={drive.components.map((c) => ({ id: c.id, name: c.name }))}
                  pledges={openPledges.map((p) => ({
                    id: p.id,
                    componentId: p.componentId,
                    outstanding: p.outstanding,
                    label: `${p.contributorName ?? "Member"}: ${countNoun(p.outstanding, p.componentName)} still to come`,
                  }))}
                />
              </Panel>
            </Section>
          ) : null}

          {isCoordinator && isKit && active ? (
            <Section title="Pack kits" id="pack" description="Record kits once they're complete. Packing moves supplies out of the collected pile and into kits.">
              <Panel className="space-y-6">
                <PackForm commitmentId={commitment.id} packableNow={progress.packableNow} unitName={unit} />
                {stages.ready > 0 ? (
                  <details className="border-t border-line pt-4">
                    <summary className="cursor-pointer font-semibold text-forest">Packed too many by mistake?</summary>
                    <div className="mt-3">
                      <UnpackForm commitmentId={commitment.id} ready={stages.ready} unitName={unit} />
                    </div>
                  </details>
                ) : null}
                <p className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
                  <AppLink href={`/drives/${commitment.id}/packing-sheet`} className="inline-flex items-center gap-1.5 font-semibold">
                    <Printer aria-hidden className="size-4" /> Printable packing sheet
                  </AppLink>
                </p>
              </Panel>
            </Section>
          ) : null}

          {isCoordinator && stages.needsFollowUp > 0 ? (
            <Section title={`${countNoun(stages.needsFollowUp, unit)} not accepted`} id="follow-up" description={`${org.name} didn't accept these. Fix them and mark them ready, or set them aside and replace them.`}>
              <Panel>
                <FollowUpForms commitmentId={commitment.id} needsFollowUp={stages.needsFollowUp} unitName={unit} active={active} />
              </Panel>
            </Section>
          ) : null}

          {isCoordinator && canChange && request.status !== "cancelled" ? (
            <Section title="Report a delivery" id="deliver" description={`After you hand ${units} to ${org.name}, report it here so they can confirm what arrived.`}>
              <Panel>
                <DeliveryForm commitmentId={commitment.id} deliverableNow={progress.deliverableNow} unitName={unit} orgName={org.name} />
              </Panel>
            </Section>
          ) : null}

          <Section title="Deliveries" id="deliveries">
            {drive.deliveries.length === 0 ? (
              <p className="text-muted">No deliveries reported yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drive.deliveries.map((d) => (
                  <li key={d.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{countNoun(d.quantity, unit)} reported {formatTimestamp(d.submittedAt, request.timezone)}</p>
                      {d.status === "submitted" ? (
                        <Pill tone="info">Awaiting {org.name}'s review</Pill>
                      ) : d.status === "cancelled" ? (
                        <Pill>Taken back</Pill>
                      ) : d.notAccepted ? (
                        <Pill tone="amber">
                          {formatCount(d.accepted ?? 0)} accepted, {formatCount(d.notAccepted)} not accepted
                        </Pill>
                      ) : (
                        <Pill tone="forest">All {formatCount(d.accepted ?? 0)} accepted</Pill>
                      )}
                    </div>
                    {d.note ? <p className="text-sm text-muted">Your note: “{d.note}”</p> : null}
                    {d.reviewNote ? <p className="text-sm">{org.name}: “{d.reviewNote}”</p> : null}
                    {isCoordinator && d.status === "submitted" ? <CancelDeliveryButton deliveryId={d.id} /> : null}
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 0 ? (
              <p className="text-sm text-muted">Reported deliveries stay reserved for your group until {org.name} reviews them.</p>
            ) : null}
          </Section>

          {isGroupMember && drive.pledges.length > 0 ? (
            <Section title={isCoordinator ? "Pledges" : "Your pledges"} id="pledges">
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drive.pledges.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {countNoun(p.quantity, p.componentName)}
                        {isCoordinator ? <span className="font-normal text-muted"> from {p.isMine ? "you" : p.contributorName}</span> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {PLEDGE_STATUS[p.status]}
                        {p.received > 0 ? ` · ${formatCount(p.received)} received` : ""}
                        {p.outstanding > 0 && p.received > 0 ? ` · ${formatCount(p.outstanding)} still to come` : ""}
                        {p.note ? ` · “${p.note}”` : ""}
                      </p>
                    </div>
                    {p.outstanding > 0 && (p.isMine || isCoordinator) && active ? (
                      <ClosePledgeButton pledgeId={p.id} label={p.isMine ? "Withdraw pledge" : "Close unfulfilled pledge"} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {isGroupMember && active ? (
            <Section title="Pledge supplies" id="pledge" description="Tell your coordinator what you'll bring so the group doesn't collect too much of one thing.">
              <Panel>
                {isCoordinator ? <p className="mb-4 text-sm text-muted">Coordinators can pledge too. Most pledges come from members using the invitation link.</p> : null}
                <PledgeForm
                  commitmentId={commitment.id}
                  components={progress.components.map((c) => ({ id: c.componentId, name: c.name, uncovered: c.uncovered, stillNeeded: c.stillNeeded }))}
                />
              </Panel>
            </Section>
          ) : null}

          {isCoordinator && drive.collections.length > 0 ? (
            <Section title="Received supplies log" id="log">
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drive.collections.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className={c.voided ? "text-muted line-through" : undefined}>
                      <p>
                        <span className="font-semibold">{countNoun(c.usable, c.componentName)}</span>
                        {c.unusable > 0 ? `, plus ${formatCount(c.unusable)} not usable` : ""}
                        {c.fromPledge ? " · from a pledge" : ""}
                      </p>
                      <p className="text-sm text-muted">
                        Recorded by {c.recordedByName}, {formatTimestamp(c.createdAt, request.timezone)}
                        {c.note ? ` · “${c.note}”` : ""}
                      </p>
                    </div>
                    {c.voided ? (
                      <span className="text-sm text-muted">Removed</span>
                    ) : active ? (
                      <VoidEntryButton entryId={c.id} label={`${countNoun(c.usable, c.componentName)} recorded by ${c.recordedByName}`} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Activity" id="activity">
            <ActivityList items={drive.activity} timezone={request.timezone} />
          </Section>
            </>
          ) : (
            <>
          <Section title={isKit ? "Kits" : "Items"} id="stages">
            <Panel>
              <StageSummary stages={stages} committed={commitment.quantity} requestType={request.requestType} unitName={unit} />
            </Panel>
          </Section>

          <Section title="Supplies" id="supplies" description={drive.bottleneck.headline}>
            <Panel className="space-y-2">
              {drive.bottleneck.detail ? <p className="text-[0.95rem]">{drive.bottleneck.detail}</p> : null}
              {isKit && progress.supportedByCollected > 0 ? (
                <p className="text-sm text-muted">
                  The usable supplies collected so far make {countNoun(progress.supportedByCollected, unit)} in total, counting{" "}
                  {formatCount(stages.built)} already packed.
                </p>
              ) : null}
              <SuppliesTable components={progress.components} committed={commitment.quantity} unitName={unit} requestType={request.requestType} />
            </Panel>
          </Section>

          {isGroupMember && active ? (
            <Section title="Pledge supplies" id="pledge" description="Tell your coordinator what you'll bring so the group doesn't collect too much of one thing.">
              <Panel>
                {isCoordinator ? <p className="mb-4 text-sm text-muted">Coordinators can pledge too. Most pledges come from members using the invitation link.</p> : null}
                <PledgeForm
                  commitmentId={commitment.id}
                  components={progress.components.map((c) => ({ id: c.componentId, name: c.name, uncovered: c.uncovered, stillNeeded: c.stillNeeded }))}
                />
              </Panel>
            </Section>
          ) : null}

          {isGroupMember && drive.pledges.length > 0 ? (
            <Section title={isCoordinator ? "Pledges" : "Your pledges"} id="pledges">
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drive.pledges.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {countNoun(p.quantity, p.componentName)}
                        {isCoordinator ? <span className="font-normal text-muted"> from {p.isMine ? "you" : p.contributorName}</span> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {PLEDGE_STATUS[p.status]}
                        {p.received > 0 ? ` · ${formatCount(p.received)} received` : ""}
                        {p.outstanding > 0 && p.received > 0 ? ` · ${formatCount(p.outstanding)} still to come` : ""}
                        {p.note ? ` · “${p.note}”` : ""}
                      </p>
                    </div>
                    {p.outstanding > 0 && (p.isMine || isCoordinator) && active ? (
                      <ClosePledgeButton pledgeId={p.id} label={p.isMine ? "Withdraw pledge" : "Close unfulfilled pledge"} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Deliveries" id="deliveries">
            {drive.deliveries.length === 0 ? (
              <p className="text-muted">No deliveries reported yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {drive.deliveries.map((d) => (
                  <li key={d.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{countNoun(d.quantity, unit)} reported {formatTimestamp(d.submittedAt, request.timezone)}</p>
                      {d.status === "submitted" ? (
                        <Pill tone="info">Awaiting {org.name}'s review</Pill>
                      ) : d.status === "cancelled" ? (
                        <Pill>Taken back</Pill>
                      ) : d.notAccepted ? (
                        <Pill tone="amber">
                          {formatCount(d.accepted ?? 0)} accepted, {formatCount(d.notAccepted)} not accepted
                        </Pill>
                      ) : (
                        <Pill tone="forest">All {formatCount(d.accepted ?? 0)} accepted</Pill>
                      )}
                    </div>
                    {d.note ? <p className="text-sm text-muted">Your note: “{d.note}”</p> : null}
                    {d.reviewNote ? <p className="text-sm">{org.name}: “{d.reviewNote}”</p> : null}
                    {isCoordinator && d.status === "submitted" ? <CancelDeliveryButton deliveryId={d.id} /> : null}
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 0 ? (
              <p className="text-sm text-muted">Reported deliveries stay reserved for your group until {org.name} reviews them.</p>
            ) : null}
          </Section>

          <Section title="Activity" id="activity">
            <ActivityList items={drive.activity} timezone={request.timezone} />
          </Section>
            </>
          )}
        </div>

        <aside className="space-y-4" aria-label="Drive details">
          {isCoordinator && active ? (
            <Panel className="space-y-4">
              <h2 id="share" className="text-lg font-semibold">Share and invite</h2>
              <div className="space-y-1">
                <h3 className="font-semibold">Invite members</h3>
                <p className="text-sm text-muted">People who open this link and sign in join {group.name} and can pledge.</p>
                {inviteUrl ? <CopyLink url={inviteUrl} label="Copy invitation link" /> : null}
              </div>
              <div className="space-y-1 border-t border-line pt-4">
                <h3 className="font-semibold">Public progress page</h3>
                <p className="text-sm text-muted">Shows totals only: no names or handover details.</p>
                <CopyLink url={publicUrl} label="Copy public link" />
              </div>
            </Panel>
          ) : null}

          {role !== "organization" ? (
            <Panel className="space-y-3">
              <h2 className="text-lg font-semibold">Handover details</h2>
              <div>
                <h3 className="text-sm font-semibold text-muted">Drop-off</h3>
                <p className="whitespace-pre-line">{request.handoverInstructions || "Not provided yet."}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted">Contact at {org.name}</h3>
                <p>{request.coordinatorContact || "Not provided yet."}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted">Accepted condition</h3>
                <p>{request.conditionNotes || "Not specified."}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted">Substitutions</h3>
                <p>{request.substitutions || "None."}</p>
              </div>
            </Panel>
          ) : null}

          {isCoordinator ? (
            <Panel className="space-y-3">
              <h2 className="text-lg font-semibold">Records</h2>
              <p className="flex flex-col gap-2 text-sm">
                <AppLink href={`/drives/${commitment.id}/packing-sheet`} className="inline-flex items-center gap-1.5 font-semibold">
                  <ClipboardList aria-hidden className="size-4" /> {isKit ? "Packing sheet" : "Collection checklist"}
                </AppLink>
                <a href={`${ctx.base}/drives/${commitment.id}/export`} className="inline-flex items-center gap-1.5 font-semibold text-forest">
                  <FileDown aria-hidden className="size-4" /> Download supplies and pledges (CSV)
                </a>
              </p>
            </Panel>
          ) : null}

          {isCoordinator && canChange ? (
            <Panel className="space-y-4">
              <h2 className="text-lg font-semibold">Change this drive</h2>
              <ChangeQuantityForm commitmentId={commitment.id} current={commitment.quantity} minimum={minimum} maximum={maximum} unitName={unit} />
              <div className="space-y-2 border-t border-line pt-4">
                <p className="text-sm text-muted">If your group can't finish, withdrawing releases what you haven't delivered.</p>
                <WithdrawDrive
                  commitmentId={commitment.id}
                  releasable={Math.max(0, commitment.quantity - stages.accepted - stages.pendingReview)}
                  pendingReview={stages.pendingReview}
                  accepted={stages.accepted}
                  unitName={unit}
                  orgName={org.name}
                />
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
