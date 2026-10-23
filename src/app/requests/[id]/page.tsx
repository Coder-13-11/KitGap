import { CalendarDays, ExternalLink, MapPin, Package } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactConfirmed } from "@/components/requests/contact-badge";
import { QuickAdopt } from "@/components/requests/quick-adopt";
import { SupplyTable } from "@/components/requests/supply-table";
import { StickyAction } from "@/components/ui/sticky-action";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { RequestProgress } from "@/components/ui/progress";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { CATEGORY_LABEL, PHASE_EXPLANATION } from "@/domain/phase";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { getRequestDetail } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const detail = await getRequestDetail(await getAppContext(), id);
  return { title: detail ? detail.request.title : "Request not found" };
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

  return (
    <Container className="space-y-8 pb-24 lg:pb-0">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href="/requests">← All requests</AppLink>
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
            <div className="space-y-1">
              <p className="text-lg">
                Requested by <span className="font-semibold">{org.name}</span>
                {org.city ? <span className="text-muted"> · {org.city}</span> : null}
              </p>
              <ContactConfirmed at={org.contactConfirmedAt} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-2 text-sm text-muted">
                  <Package aria-hidden className="size-5 shrink-0 text-forest" />
                  Requested
                </dt>
                <dd className="pl-7 font-semibold">{countNoun(totals.target, unit)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm text-muted">
                  <CalendarDays aria-hidden className="size-5 shrink-0 text-forest" />
                  Needed by
                </dt>
                <dd className="pl-7 font-semibold">{formatCalendarDate(request.neededBy)}</dd>
                {deadline.description && phase !== "fulfilled" && phase !== "cancelled" ? (
                  <dd className={deadline.passed ? "pl-7 text-sm font-semibold text-amber" : "pl-7 text-sm text-muted"}>{deadline.description}</dd>
                ) : null}
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm text-muted">
                  <MapPin aria-hidden className="size-5 shrink-0 text-forest" />
                  Location
                </dt>
                <dd className="pl-7 font-semibold">{request.location}</dd>
              </div>
            </dl>
          </header>

          <Panel as="section" className="space-y-3">
            <h2 className="text-lg font-semibold">Progress</h2>
            <p className="text-ink">
              {formatCount(totals.promised)} of {countNoun(totals.target, unit)} promised by groups;{" "}
              {formatCount(totals.accepted)} confirmed received by {org.name}.
            </p>
            <RequestProgress totals={totals} unitName={unit} />
            <p className="text-sm text-muted">{PHASE_EXPLANATION[phase]}</p>
            {request.statusNote ? (
              <p className="text-sm">
                <span className="font-semibold">Note from {org.name}:</span> “{request.statusNote}”
              </p>
            ) : null}
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-labelledby="adopt-title" id="adopt-panel">
          <Panel className="space-y-4">
            <h2 id="adopt-title" className="text-xl font-semibold">
              {myActiveDrive ? "Your group's drive" : "Start a drive for this request"}
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
                  <span className="text-muted">of {countNoun(totals.target, unit)} still open for groups to adopt.</span>
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
          <Panel className="space-y-2 text-sm">
            <h2 className="font-semibold">What happens after you start a drive</h2>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>Your group gets the exact supply list for its share.</li>
              <li>Members pledge items; you record what actually arrives.</li>
              {request.requestType === "kit" ? <li>You pack complete kits and hand them over.</li> : <li>You hand the items over.</li>}
              <li>{org.name} confirms what it received. Only confirmed items count as fulfilled.</li>
            </ol>
          </Panel>
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

          <Section title="Groups running drives" id="drives">
            {activeDrives.length === 0 ? (
              <p className="text-muted">No group has started a drive for this request yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {activeDrives.map((d) => (
                  <li key={d.commitmentId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                    <span>
                      <span className="font-semibold">{d.groupName}</span>
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
                  <li key={u.id} className="rounded-lg border border-line bg-surface px-4 py-3">
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
          Start a drive · {formatCount(totals.available)} {totals.available === 1 ? unit.toLowerCase() : units} open
        </StickyAction>
      ) : null}
    </Container>
  );
}
