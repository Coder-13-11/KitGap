import { formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount, listPhrase } from "@/domain/text";
import type { PublicRecord } from "@/server/queries/records";
import { AppLink } from "../ui/base";
import { Container, Panel, Section } from "../ui/layout-bits";
import { RecipientStamp } from "../ui/confirmation";

function counts(totals: { unitName: string; accepted: number }[]): string {
  return listPhrase(totals.map((total) => countNoun(total.accepted, total.unitName)));
}

function totalSentence(totals: { unitName: string; accepted: number }[]): string {
  if (totals.length === 0) return "Nothing has been confirmed by a receiving organization yet.";
  return `${counts(totals)} confirmed by receiving organizations.`;
}

export function PublicRecordView({ record }: { record: PublicRecord }) {
  const partnerHeading = record.kind === "group" ? "Worked with" : "Groups that delivered";
  const lead = record.totals.find((total) => total.unitName.trim().toLowerCase() === "kit") ?? record.totals[0];
  return (
    <Container className="space-y-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted">{record.city}</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight break-words sm:text-4xl">{record.name}</h1>
          <h2 className="text-xl font-semibold">Confirmed record</h2>
          {lead ? (
            <p className="font-serif text-6xl leading-none font-semibold tracking-tight text-forest tabular">{formatCount(lead.accepted)}</p>
          ) : null}
          {record.totals.length > 0 || record.recipientTotals.length === 0 ? <p className="text-lg">{totalSentence(record.totals)}</p> : null}
          {record.recipientTotals.length > 0 ? (
            <p>
              <RecipientStamp /> {record.totals.length > 0 ? "Also " : ""}
              {counts(record.recipientTotals)} confirmed by recipients that aren&rsquo;t on KitGap, through a receipt link.{" "}
              {record.totals.length > 0 ? "Those aren\u2019t counted above." : "None yet from a KitGap-verified organization."}
            </p>
          ) : null}
          <p className="text-muted">Promises and kits awaiting review are not included.</p>
        </div>
        {record.milestone ? (
          <Panel tone="forest" className="space-y-2">
            <p className="text-sm font-semibold text-forest-dark">Milestone</p>
            <h2 className="font-serif text-2xl font-semibold">{record.milestone.title}</h2>
            <p>{record.milestone.detail}</p>
          </Panel>
        ) : null}
      </header>

      <Section title={partnerHeading} id="partners">
        {record.partners.length === 0 ? (
          <p className="text-muted">
            {record.kind === "group"
              ? "No organization has confirmed a delivery from this group yet."
              : "No group has a delivery this organization has confirmed yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {record.partners.map((partner) => (
              <li key={partner.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <AppLink
                  href={record.kind === "group" ? `/record/organization/${partner.id}` : `/record/group/${partner.id}`}
                  className="font-semibold underline"
                >
                  {partner.name}
                </AppLink>
                <span className="text-sm">{counts(partner.totals)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Timeline" id="timeline">
        {record.timeline.length === 0 ? (
          <p className="text-muted">Confirmed deliveries will appear here.</p>
        ) : (
          <ol className="space-y-4">
            {record.timeline.map((event) => (
              <li key={event.id} className="grid gap-1 border-l-2 border-line pl-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <p className="text-sm text-muted">
                  <time dateTime={event.reviewedAt.toISOString()}>{formatTimestamp(event.reviewedAt, "America/New_York")}</time>
                </p>
                <div>
                  <p>
                    {event.tier === "recipient" ? (
                      <>
                        <RecipientStamp /> {countNoun(event.accepted, event.unitName)} confirmed by {event.partnerName}, through a receipt
                        link
                      </>
                    ) : record.kind === "group" ? (
                      `${countNoun(event.accepted, event.unitName)} confirmed by ${event.partnerName}`
                    ) : (
                      `${countNoun(event.accepted, event.unitName)} confirmed from ${event.partnerName}`
                    )}
                  </p>
                  <p className="text-sm">
                    {event.tier === "recipient" ? (
                      event.requestTitle
                    ) : (
                      <AppLink href={`/requests/${event.requestId}`} className="underline">
                        {event.requestTitle}
                      </AppLink>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </Container>
  );
}
