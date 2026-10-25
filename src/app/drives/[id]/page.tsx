import { ClipboardList, FileDown, Printer } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DriveChecklist, DriveHero, DriveSectionNav, KitsReadyMark, NextStepCard } from "@/components/drives/dashboard";
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
import { ConnectForm } from "@/components/drives/connect-form";
import { ImportSignups } from "@/components/drives/import-signups";
import { ReceiptLink } from "@/components/drives/receipt-link";
import { TierStamp, tierExplanation } from "@/components/ui/confirmation";
import { ShareDrive } from "@/components/drives/share-drive";
import { DonationJourneySection } from "@/components/drives/journey";
import { StageSummary } from "@/components/drives/stages";
import { SuppliesTable } from "@/components/drives/supplies";
import { ActivityList } from "@/components/site/activity-list";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { CopyLink } from "@/components/ui/copy-link";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { StickyAction } from "@/components/ui/sticky-action";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { getDriveWorkspace, type DriveWorkspace } from "@/server/queries/drives";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

export const metadata: Metadata = { title: "Drive" };

const NEXT_ANCHOR: Partial<Record<string, { id: string; label: string }>> = {
  follow_up: { id: "follow-up", label: "Go to kits not accepted" },
  deliver: { id: "deliver", label: "Go to report a delivery" },
  pack: { id: "pack", label: "Go to pack kits" },
  record: { id: "record", label: "Go to record received supplies" },
  share: { id: "share", label: "Go to share and invite" },
};

const PLEDGE_STATUS: Record<DriveWorkspace["pledges"][number]["status"], string> = {
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
  const next = NEXT_ANCHOR[drive.nextStep.action];
  const canImport = isCoordinator && active && request.status !== "cancelled";

  const heroAction = isCoordinator
    ? {
        eyebrow: "Next step",
        title: drive.nextStep.title,
        detail: drive.nextStep.detail,
        href: next ? `#${next.id}` : undefined,
        label: next?.label,
      }
    : role === "contributor" && active
      ? {
          eyebrow: "How you can help",
          title: "Say what you'll bring",
          detail: "Pick an item and how many. Your coordinator sees it, so the group doesn't end up with too much of one thing.",
          href: "#pledge",
          label: "Go to pledge supplies",
        }
      : null;

  const jumpLinks = [
    { href: "#supplies", label: "Supplies" },
    ...(canImport ? [{ href: "#import", label: "Import sign-ups" }] : []),
    ...(isCoordinator && active ? [{ href: "#record", label: "Record received supplies" }] : []),
    ...(isCoordinator && isKit && active ? [{ href: "#pack", label: "Pack kits" }] : []),
    ...(isCoordinator && stages.needsFollowUp > 0 ? [{ href: "#follow-up", label: "Not accepted" }] : []),
    ...(isCoordinator && canChange && request.status !== "cancelled" ? [{ href: "#deliver", label: "Report a delivery" }] : []),
    { href: "#deliveries", label: "Deliveries" },
    ...(isGroupMember && drive.pledges.length > 0 ? [{ href: "#pledges", label: isCoordinator ? "Pledges" : "Your pledges" }] : []),
    ...(isGroupMember && active ? [{ href: "#pledge", label: "Pledge supplies" }] : []),
    { href: "#activity", label: "Activity" },
  ];

  const stagesSection = (
    <Section title={isKit ? "Kits" : "Items"} id="stages" description={`Where every ${unit.toLowerCase()} in this drive is right now.`}>
      <Panel>
        <StageSummary stages={stages} committed={commitment.quantity} requestType={request.requestType} unitName={unit} />
      </Panel>
    </Section>
  );

  const suppliesSection = (
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
  );

  const pledgeFormSection =
    isGroupMember && active ? (
      <Section title="Pledge supplies" id="pledge" description="Tell your coordinator what you'll bring so the group doesn't collect too much of one thing.">
        <Panel>
          {isCoordinator ? <p className="mb-4 text-sm text-muted">Coordinators can pledge too. Most pledges come from members using the invitation link.</p> : null}
          <PledgeForm
            commitmentId={commitment.id}
            unitName={unit}
            components={progress.components.map((c) => ({
              id: c.componentId,
              name: c.name,
              uncovered: c.uncovered,
              stillNeeded: c.stillNeeded,
              quantityPerUnit: c.quantityPerUnit,
            }))}
          />
        </Panel>
      </Section>
    ) : null;

  const pledgesSection =
    isGroupMember && drive.pledges.length > 0 ? (
      <Section title={isCoordinator ? "Pledges" : "Your pledges"} id="pledges">
        <ul className="tag-shape divide-y divide-line border border-line-strong bg-surface shadow-card">
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
                {p.imported ? (
                  <p className="text-sm text-muted">
                    Imported from {p.imported.source}
                    {p.imported.email ? ` · ${p.imported.email}` : ""}
                  </p>
                ) : null}
              </div>
              {p.outstanding > 0 && (p.isMine || isCoordinator) && active ? (
                <ClosePledgeButton pledgeId={p.id} label={p.isMine ? "Withdraw pledge" : "Close unfulfilled pledge"} />
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
    ) : null;

  const deliveriesSection = (
    <Section title="Deliveries" id="deliveries">
      {drive.deliveries.length === 0 ? (
        <p className="text-muted">No deliveries reported yet.</p>
      ) : (
        <ul className="tag-shape divide-y divide-line border border-line-strong bg-surface shadow-card">
          {drive.deliveries.map((d) => (
            <li key={d.id} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {countNoun(d.quantity, unit)} reported {formatTimestamp(d.submittedAt, request.timezone)}
                </p>
                {d.status === "submitted" ? (
                  <Pill tone="info">Awaiting {org.name}&apos;s {drive.tier === "recipient" ? "confirmation" : "review"}</Pill>
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
              {d.status === "reviewed" ? (
                <p className="text-sm">
                  <TierStamp tier={d.confirmedVia === "receipt" ? "recipient" : "verified"} />{" "}
                  {d.confirmedVia === "receipt" && d.signedName ? `by ${d.signedName}, ${org.name}, through the receipt link` : `by ${org.name}`}
                </p>
              ) : null}
              {d.note ? <p className="text-sm text-muted">Your note: “{d.note}”</p> : null}
              {d.reviewNote ? <p className="text-sm">{org.name}: “{d.reviewNote}”</p> : null}
              {isCoordinator && d.status === "submitted" && drive.tier === "recipient" ? (
                <ReceiptLink deliveryId={d.id} recipientName={org.name} alreadyIssued={Boolean(d.receiptIssuedAt)} />
              ) : null}
              {isCoordinator && d.status === "submitted" ? <CancelDeliveryButton deliveryId={d.id} /> : null}
            </li>
          ))}
        </ul>
      )}
      {pending.length > 0 ? <p className="text-sm text-muted">Reported deliveries stay reserved for your group until {org.name} {drive.tier === "recipient" ? "confirms them" : "reviews them"}.</p> : null}
    </Section>
  );

  const journeySection = isGroupMember ? <DonationJourneySection journey={drive.journey} timezone={request.timezone} requestId={request.id} /> : null;

  const activitySection = (
    <Section title="Activity" id="activity">
      <ActivityList items={drive.activity} timezone={request.timezone} />
    </Section>
  );

  return (
    <Container className="space-y-6 pb-24 lg:pb-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-4 text-sm">
        <AppLink href="/drives">← My drives</AppLink>
        {drive.tier === "verified" ? <AppLink href={`/requests/${request.id}`}>View the request</AppLink> : null}
        <AppLink href={`/record/group/${group.id}`}>Confirmed record</AppLink>
      </nav>

      {flags.started ? (
        <Notice tone="success" live="polite" title="Your drive has started">
          <p>
            {countNoun(commitment.quantity, unit)} {commitment.quantity === 1 ? "is" : "are"} reserved for {group.name}. Next, share the supply
            list with your group and invite members to pledge.
          </p>
          {isCoordinator && inviteUrl ? (
            <div className="mt-3">
              <ShareDrive
                url={inviteUrl}
                subject={`Help ${group.name} collect ${units}`}
                sentence={`Join ${group.name} on KitGap to help make ${countNoun(commitment.quantity, unit).toLowerCase()} for ${org.name}. Open the link, sign in, and say what you can bring.`}
                copyLabel="Copy invitation link"
                qrName="kitgap-invite"
              />
            </div>
          ) : null}
        </Notice>
      ) : null}

      <header className="space-y-3">
        <p className="text-sm font-semibold text-muted">
          {group.name} · drive for {org.name}
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{request.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {active ? <Pill tone="forest">Drive active</Pill> : <Pill tone="danger">Withdrawn</Pill>}
          {drive.tier === "recipient" ? <Pill>Your own drive · not listed</Pill> : <PhaseBadge phase={drive.phase} />}
          {role === "organization" ? <Pill tone="info">Viewing as the receiving organization</Pill> : null}
          {role === "contributor" ? <Pill>You're a member</Pill> : null}
          {request.neededBy ? (
            <span className={drive.deadline.passed && stages.accepted < commitment.quantity ? "text-sm font-semibold text-amber" : "text-sm text-muted"}>
              Needed by {formatCalendarDate(request.neededBy)}
              {drive.deadline.description && stages.accepted < commitment.quantity
                ? ` · ${drive.deadline.passed ? `overdue: ${drive.deadline.description.toLowerCase()}` : drive.deadline.description.toLowerCase()}`
                : ""}
            </span>
          ) : null}
        </div>
        {drive.tier === "recipient" && role !== "organization" ? (
          <p className="max-w-2xl text-sm text-muted">{tierExplanation("recipient", org.name)}</p>
        ) : null}
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

      {isCoordinator ? (
        <div className="space-y-10 pt-4">
          <NextStepCard title={drive.nextStep.title} detail={drive.nextStep.detail} href={next ? `#${next.id}` : undefined} label={next?.label} />
          <div className="space-y-6">
            <KitsReadyMark stages={stages} committed={commitment.quantity} unitName={unit} requestType={request.requestType} />
            <section aria-labelledby="supply-checklist-title" className="space-y-3">
              <div className="space-y-1">
                <h2 id="supply-checklist-title" className="font-serif text-2xl font-semibold tracking-tight">
                  Supply checklist
                </h2>
                <p className="max-w-prose">{drive.bottleneck.headline}</p>
                {drive.bottleneck.detail ? <p className="max-w-prose text-muted">{drive.bottleneck.detail}</p> : null}
              </div>
              <Panel>
                {isKit && progress.supportedByCollected > 0 ? (
                  <p className="mb-3 text-sm text-muted">
                    The usable supplies collected so far make {countNoun(progress.supportedByCollected, unit)} in total, counting{" "}
                    {formatCount(stages.built)} already packed.
                  </p>
                ) : null}
                <SuppliesTable components={progress.components} committed={commitment.quantity} unitName={unit} requestType={request.requestType} />
              </Panel>
              {canImport ? (
                <a href="#import" className={buttonClass("secondary")}>
                  Import sign-ups
                </a>
              ) : null}
            </section>
          </div>
        </div>
      ) : (
        <>
          <DriveHero
            stages={stages}
            committed={commitment.quantity}
            unitName={unit}
            groupName={group.name}
            orgName={org.name}
            viewer={role}
            action={heroAction}
          />
          <DriveChecklist steps={drive.checklist} linked={false} />
        </>
      )}

      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          {isCoordinator ? (
            <>
              <DriveSectionNav
                links={[
                  { href: "#supplies", label: "Supplies" },
                  { href: "#contributors", label: "Contributors" },
                  ...(isKit ? [{ href: "#packing", label: "Packing" }] : []),
                  { href: "#delivery", label: "Delivery" },
                ]}
              />

              <Section
                title="Supplies"
                id="supplies"
                className="scroll-mt-32"
                description="Count only what has physically arrived. Record anything unusable separately."
              >
                <div className="space-y-8">
                <div id="record" className="scroll-mt-32">
                  {active ? (
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
                  ) : (
                    <p className="text-muted">Recording is closed because this drive was withdrawn.</p>
                  )}
                </div>
                {drive.collections.length > 0 ? (
                  <div id="log" className="space-y-3">
                    <h3 className="text-lg font-semibold">Received supplies log</h3>
                    <ul className="tag-shape divide-y divide-line border border-line-strong bg-surface shadow-card">
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
                  </div>
                ) : null}
                </div>
              </Section>

              <Section title="Contributors" id="contributors" className="scroll-mt-32" description="Who is bringing supplies, and how to ask for more.">
                <div className="space-y-8">
                {canImport ? (
                  <div className="space-y-4">
                    <ImportSignups commitmentId={commitment.id} unitName={unit} sample={ctx.mode === "demo"} />
                    <ConnectForm commitmentId={commitment.id} live={ctx.mode === "live"} webhook={drive.formWebhook} />
                  </div>
                ) : null}
                {pledgesSection}
                {pledgeFormSection}
                {active ? (
                  <div id="share" className="scroll-mt-32">
                    <Panel className="space-y-4">
                      <h3 className="font-serif text-xl font-semibold">Share and invite</h3>
                      <div className="space-y-1">
                        <h4 className="font-semibold">Invite members</h4>
                        <p className="text-sm text-muted">People who open this link and sign in join {group.name} and can pledge.</p>
                        {inviteUrl ? (
                          <ShareDrive
                            url={inviteUrl}
                            size="sm"
                            subject={`Help ${group.name} collect ${units}`}
                            sentence={`Join ${group.name} on KitGap to help make ${countNoun(commitment.quantity, unit).toLowerCase()} for ${org.name}. Open the link, sign in, and say what you can bring.`}
                            copyLabel="Copy invitation link"
                            qrName="kitgap-invite"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-1 border-t border-line pt-4">
                        <h4 className="font-semibold">Public progress page</h4>
                        <p className="text-sm text-muted">Shows totals only: no names or handover details.</p>
                        <CopyLink url={publicUrl} label="Copy public link" />
                      </div>
                    </Panel>
                  </div>
                ) : null}
                </div>
              </Section>

              {isKit ? (
                <Section title="Packing" id="packing" className="scroll-mt-32" description="Record kits once they're complete. Packing moves supplies into kits.">
                  <div className="space-y-8">
                  <div id="pack" className="scroll-mt-32">
                    {active ? (
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
                        <p className="border-t border-line pt-4 text-sm">
                          <AppLink href={`/drives/${commitment.id}/packing-sheet`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold">
                            <Printer aria-hidden className="size-4" /> Printable packing sheet
                          </AppLink>
                        </p>
                      </Panel>
                    ) : (
                      <p className="text-muted">Packing is closed because this drive was withdrawn.</p>
                    )}
                  </div>
                  {stages.needsFollowUp > 0 ? (
                    <Section
                      title={`${countNoun(stages.needsFollowUp, unit)} not accepted`}
                      id="follow-up"
                      className="scroll-mt-32"
                      description={`${org.name} didn't accept these. Fix them and mark them ready, or set them aside and replace them.`}
                    >
                      <Panel>
                        <FollowUpForms commitmentId={commitment.id} needsFollowUp={stages.needsFollowUp} unitName={unit} active={active} />
                      </Panel>
                    </Section>
                  ) : null}
                  </div>
                </Section>
              ) : null}

              <Section title="Delivery" id="delivery" className="scroll-mt-32" description={`Hand ${units} to ${org.name}, then report what you delivered so they can confirm it.`}>
                <div className="space-y-8">
                {!isKit && stages.needsFollowUp > 0 ? (
                  <Section
                    title={`${countNoun(stages.needsFollowUp, unit)} not accepted`}
                    id="follow-up"
                    className="scroll-mt-32"
                    description={`${org.name} didn't accept these. Fix them and mark them ready, or set them aside and replace them.`}
                  >
                    <Panel>
                      <FollowUpForms commitmentId={commitment.id} needsFollowUp={stages.needsFollowUp} unitName={unit} active={active} />
                    </Panel>
                  </Section>
                ) : null}
                <div id="deliver" className="scroll-mt-32">
                  {canChange && request.status !== "cancelled" ? (
                    <Panel>
                      <DeliveryForm commitmentId={commitment.id} deliverableNow={progress.deliverableNow} unitName={unit} orgName={org.name} />
                    </Panel>
                  ) : (
                    <p className="text-muted">No new delivery can be reported on this drive.</p>
                  )}
                </div>
                {deliveriesSection}
                {stagesSection}
                </div>
              </Section>

              {journeySection}
              {activitySection}
            </>
          ) : (
            <>
              {suppliesSection}
              {pledgeFormSection}
              {pledgesSection}
              {journeySection}
              {stagesSection}
              {deliveriesSection}
              {activitySection}
            </>
          )}
        </div>

        <aside className="space-y-6" aria-label="Drive details">
          {isCoordinator ? null : (
            <nav aria-label="On this page" className="tag-shape hidden border border-line-strong bg-surface p-5 shadow-card lg:block">
              <h2 className="text-sm font-semibold text-muted">On this page</h2>
              <ul className="mt-2 space-y-1">
                {jumpLinks.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="block min-h-11 rounded-md px-2 py-2 font-semibold no-underline hover:bg-sunken">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <Panel className="space-y-3">
            <h2 className="text-lg font-semibold">About this drive</h2>
            <dl className="space-y-2 text-[0.95rem]">
              <div>
                <dt className="text-sm text-muted">Commitment</dt>
                <dd className="font-semibold">{countNoun(commitment.quantity, unit)}</dd>
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
          </Panel>

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

      {isCoordinator && next ? (
        <StickyAction targetId={next.id} hideWhenId="next-step" href={`#${next.id}`}>
          {next.label}
        </StickyAction>
      ) : role === "contributor" && active ? (
        <StickyAction targetId="pledge" href="#pledge">
          Pledge supplies
        </StickyAction>
      ) : null}
    </Container>
  );
}
