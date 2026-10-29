import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactConfirmed } from "@/components/requests/contact-badge";
import { WhatHappensNext } from "@/components/drives/what-happens-next";
import { QuickAdopt } from "@/components/requests/quick-adopt";
import { SupplyTable } from "@/components/requests/supply-table";
import { StickyAction } from "@/components/ui/sticky-action";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { RequestProgress } from "@/components/ui/progress";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { oneKitNeedsSentence } from "@/domain/guidance";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { CATEGORY_LABEL, PHASE_EXPLANATION } from "@/domain/phase";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { getRequestDetail } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";
import { recordView, viewCount } from "@/server/queries/reach";
import { AskKitCard } from "@/components/kit/ask-kit-card";
import { ShareKit } from "@/components/requests/share-kit";
import { shareCaption } from "@/domain/share";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const detail = await getRequestDetail(await getAppContext(), id);
  if (!detail) return { title: "Request not found" };
  const { request, org, totals } = detail;
  const description = `${org.name} needs ${countNoun(totals.target, request.unitName)} by ${formatCalendarDate(request.neededBy)}. ${formatCount(totals.available)} still need someone.`;
  return { title: request.title, description, openGraph: { siteName: "KitGap", type: "website", title: request.title, description } };
}

export default async function RequestPage({ params }: Params) {
  const { id } = await params;
  const ctx = await getAppContext();
  const detail = await getRequestDetail(ctx, id);
  if (!detail) notFound();
  const { request, org, totals, phase, deadline, viewer } = detail;
  const unit = request.unitName;
  const units = pluralize(unit).toLowerCase();
  const myActiveDrive = viewer.adminGroups.find((g) => g.existingCommitmentId) ?? null;
  const memberDrive = viewer.memberDriveIds[0] ?? null;
  const activeDrives = detail.drives.filter((d) => d.status === "active");
  const pastDrives = detail.drives.filter((d) => d.status !== "active");
  const isDraftView = !["published", "closed", "cancelled"].includes(request.status);
  const shareable = request.status === "published";
  // Count visits from the public, not from the organization checking its own page.
  if (shareable && !viewer.isOrgMember) await recordView(ctx, "request", request.id);
  const views = shareable ? await viewCount(ctx, "request", request.id) : null;
  const pageUrl = `${siteUrl()}${ctx.base}/requests/${request.id}`;
  const caption = shareCaption({
    orgName: org.name,
    still: totals.available,
    unitName: unit,
    items: request.requestType === "kit" ? detail.components.map((c) => countNoun(c.quantityPerUnit, c.name).toLowerCase()) : [],
    neededBy: request.neededBy,
    url: pageUrl,
  });

  return (
    <Container className="space-y-8 pb-24 lg:pb-0">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href="/requests">← Find</AppLink>
      </nav>

      {isDraftView ? (
        <Notice tone="info" title="Preview">
          Only your organization and KitGap reviewers can see this page until the request is published.
        </Notice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge phase={phase} />
              <Pill>{CATEGORY_LABEL[request.category]}</Pill>
              <Pill>{request.requestType === "kit" ? "Complete kits" : "Single item"}</Pill>
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{request.title}</h1>
            <p className="text-lg">
              Requested by{" "}
              <AppLink href={`/record/organization/${org.id}`} className="font-semibold">
                {org.name}
              </AppLink>
              {org.city ? <span className="text-muted"> · {org.city}</span> : null}
            </p>
            <ContactConfirmed at={org.contactConfirmedAt} />
            <p className="text-muted">
              Needed by <span className="font-semibold text-ink">{formatCalendarDate(request.neededBy)}</span>
              {deadline.description && phase !== "fulfilled" && phase !== "cancelled" ? (
                <span className={deadline.passed ? "font-semibold text-amber" : undefined}> · {deadline.description}</span>
              ) : null}
            </p>
          </header>

          <section aria-labelledby="open-count" className="tag-shape border border-line-strong bg-surface px-5 py-5 shadow-card sm:px-6">
            <h2 id="open-count" className="font-serif text-4xl leading-none font-semibold tracking-tight">
              <span className="tabular">{formatCount(totals.available)}</span>{" "}
              <span className="text-[0.6em]">{totals.available === 1 ? unit.toLowerCase() : units} still needed</span>
            </h2>
            <div className="mt-4">
              <RequestProgress totals={totals} unitName={unit} />
            </div>
            <p className="mt-3">
              {formatCount(totals.promised)} of {countNoun(totals.target, unit)} promised by groups; {formatCount(totals.accepted)} confirmed
              received by {org.name}.
            </p>
            {request.requestType === "kit" && detail.components.length > 0 ? <p className="mt-3">{oneKitNeedsSentence(detail.components, unit)}</p> : null}
            <p className="mt-3 text-sm text-muted">{PHASE_EXPLANATION[phase]}</p>
            {request.statusNote ? (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Note from {org.name}:</span> “{request.statusNote}”
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-labelledby="adopt-title" id="adopt-panel">
          <Panel className="space-y-4">
            <h2 id="adopt-title" className="text-xl font-semibold">
              {myActiveDrive ? "You're helping with this" : "Help with this need"}
            </h2>
            {myActiveDrive ? (
              <>
                <p>{myActiveDrive.name} already has a drive for this request.</p>
                <ButtonLink href={`/drives/${myActiveDrive.existingCommitmentId}`} full>
                  Go to your drive
                </ButtonLink>
              </>
            ) : viewer.canAdopt ? (
              <>
                <p className="text-ink">
                  <span className="tabular text-2xl font-semibold">{formatCount(totals.available)}</span>{" "}
                  <span className="text-muted">of {countNoun(totals.target, unit)} still need someone.</span>
                </p>
                <QuickAdopt
                  requestId={request.id}
                  available={totals.available}
                  unitName={unit}
                  requestType={request.requestType}
                  components={detail.components.map((c) => ({ id: c.id, name: c.name, quantityPerUnit: c.quantityPerUnit }))}
                />
              </>
            ) : (
              <p className="text-muted">{PHASE_EXPLANATION[phase]}</p>
            )}
            {memberDrive && !myActiveDrive ? (
              <p className="text-sm">
                <AppLink href={`/drives/${memberDrive}`} className="font-semibold">
                  Open your group's drive
                </AppLink>
              </p>
            ) : null}
            {viewer.isOrgMember ? (
              <p className="border-t border-line pt-3 text-sm">
                <AppLink href={`/organization/${org.id}/requests/${request.id}`} className="font-semibold">
                  Manage this request
                </AppLink>
              </p>
            ) : null}
          </Panel>
          {shareable && (viewer.isOrgMember || myActiveDrive || memberDrive) ? <AskKitCard requestId={request.id} /> : null}
          {shareable ? (
            <Panel className="space-y-3">
              <h2 className="text-xl font-semibold">Share this need</h2>
              <p className="text-sm text-muted">Post it where your neighbors already look: Instagram, Facebook, a group chat or a school announcement.</p>
              <ShareKit url={pageUrl} caption={caption} imagePath={`${ctx.base}/requests/${request.id}/post-image`} fileName="kitgap-need" views={views} />
            </Panel>
          ) : null}
          {viewer.canAdopt && !myActiveDrive ? (
            <WhatHappensNext orgName={org.name} isKit={request.requestType === "kit"} neededBy={formatCalendarDate(request.neededBy)} share={null} />
          ) : null}
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
          <Section title={request.requestType === "kit" ? `What goes in each ${unit.toLowerCase()}` : "What's requested"} id="recipe">
            <Panel>
              <SupplyTable
                caption={request.requestType === "kit" ? `Items in each ${unit}` : "Requested item"}
                units={totals.target}
                unitName={unit}
                showPerUnit={request.requestType === "kit"}
                rows={detail.supply.map((line) => ({
                  key: line.componentId,
                  name: line.name,
                  details: line.details,
                  perUnit: line.quantityPerUnit,
                  total: line.total,
                }))}
              />
              {request.requestType === "item" ? (
                <p className="mt-3 text-sm text-muted">
                  One requested unit is one {unit.toLowerCase()}. Groups collect them and hand them over; there's nothing to assemble.
                </p>
              ) : null}
            </Panel>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-semibold">Accepted condition</dt>
                <dd className="text-muted">{request.conditionNotes || "Not specified. Ask the organization if unsure."}</dd>
              </div>
              <div>
                <dt className="font-semibold">Accepted substitutions</dt>
                <dd className="text-muted">{request.substitutions || "None. Please bring the items as listed."}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Why it's needed" id="need">
            <p className="max-w-prose whitespace-pre-line">{request.need}</p>
            <p className="max-w-prose text-muted">
              <span className="font-semibold text-ink">Who it helps: </span>
              {request.beneficiaries}
            </p>
          </Section>

          {detail.privateDetails ? (
            <Section
              title="Handover details"
              id="handover"
              description={viewer.isOrgMember ? "Visible to your organization and to groups running a drive." : "Visible to you because your group is running a drive."}
            >
              <Panel className="space-y-3">
                <div>
                  <h3 className="font-semibold">Drop-off instructions</h3>
                  <p className="whitespace-pre-line">{detail.privateDetails.handoverInstructions || "Not provided yet."}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Coordinator contact</h3>
                  <p>{detail.privateDetails.coordinatorContact || "Not provided yet."}</p>
                </div>
              </Panel>
            </Section>
          ) : null}

          <Section title="People helping" id="drives">
            {activeDrives.length === 0 ? (
              <p className="text-muted">Nobody has started helping with this yet. You could be first.</p>
            ) : (
              <ul className="tag-shape divide-y divide-line border border-line-strong bg-surface">
                {activeDrives.map((d) => (
                  <li key={d.commitmentId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                    <span>
                      <AppLink href={`/record/group/${d.groupId}`} className="font-semibold underline">
                        {d.groupName}
                      </AppLink>
                      {d.groupCity ? <span className="text-muted"> · {d.groupCity}</span> : null}
                    </span>
                    <span className="tabular text-sm">
                      {countNoun(d.quantity, unit)} promised; {formatCount(d.accepted)} confirmed received
                      {d.pendingReview > 0 ? `; ${formatCount(d.pendingReview)} awaiting review` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pastDrives.length > 0 ? (
              <p className="text-sm text-muted">
                {pastDrives.length === 1 ? "1 earlier drive was" : `${pastDrives.length} earlier drives were`} withdrawn. Anything they
                delivered and the organization accepted still counts.
              </p>
            ) : null}
          </Section>

          {detail.updates.length > 0 ? (
            <Section title={`Updates from ${org.name}`} id="updates">
              <ul className="space-y-3">
                {detail.updates.map((u) => (
                  <li key={u.id} className="tag-shape border border-line-strong bg-surface px-4 py-3">
                    <p className="whitespace-pre-line">{u.body}</p>
                    <p className="mt-1 text-sm text-muted">{formatTimestamp(u.createdAt, request.timezone)}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {request.fundraisingUrl ? (
            <Section title="External fundraising page" id="fundraising">
              <Panel className="space-y-2">
                <p>
                  {org.name} also accepts money through its own page. KitGap doesn't process or track money, and gifts made there
                  don't count toward the {units} above.
                </p>
                <a href={request.fundraisingUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold break-all">
                  {new URL(request.fundraisingUrl).hostname}
                  <ExternalLink aria-hidden className="size-4" />
                  <span className="sr-only">(opens an external site in a new tab)</span>
                </a>
              </Panel>
            </Section>
          ) : null}
        </div>

      </div>

      {viewer.canAdopt && !myActiveDrive ? (
        <StickyAction targetId="adopt-panel" href="#adopt-title">
          Help with this · {formatCount(totals.available)} {totals.available === 1 ? unit.toLowerCase() : units} needed
        </StickyAction>
      ) : null}
    </Container>
  );
}
