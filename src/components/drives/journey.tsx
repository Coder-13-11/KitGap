import { formatTimestamp } from "@/domain/dates";
import type { DonationJourney } from "@/domain/journey";
import { AppLink } from "../ui/base";
import { Section } from "../ui/layout-bits";

export function DonationJourneySection({
  journey,
  timezone,
  requestId,
}: {
  journey: DonationJourney;
  timezone: string;
  requestId: string;
}) {
  return (
    <Section title="Where your items went" id="journey" description="Only you and your coordinators see your name.">
      {journey.steps.length === 0 ? (
        <p className="text-muted">You haven't pledged any items on this drive yet.</p>
      ) : (
        <ol>
          {journey.steps.map((step, index) => (
            <li key={step.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4">
              <div className="flex flex-col items-center" aria-hidden>
                <span className="mt-1.5 size-3 shrink-0 rounded-full bg-forest ring-4 ring-forest-tint" />
                {index < journey.steps.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
              </div>
              <div className={index < journey.steps.length - 1 ? "pb-6" : undefined}>
                <p className="text-sm text-muted">
                  <time dateTime={step.at.toISOString()}>{formatTimestamp(step.at, timezone)}</time>
                </p>
                <p className="font-semibold">{step.label}</p>
                <p className="mt-1">{step.title}</p>
                {step.detail ? <p className="text-sm text-muted">{step.detail}</p> : null}
                {step.note ? <p className="text-sm">Message: {step.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
      {journey.closing ? (
        <p>
          {journey.closing.sentence}{" "}
          <AppLink href={`/requests/${requestId}`} className="font-semibold underline">
            View the request
          </AppLink>
        </p>
      ) : null}
    </Section>
  );
}
