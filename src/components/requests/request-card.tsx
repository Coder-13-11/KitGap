import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { formatCalendarDate } from "@/domain/dates";
import { CATEGORY_LABEL } from "@/domain/phase";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import type { RequestSummary } from "@/server/queries/requests";
import { AppLink } from "../ui/base";
import { PhaseBadge } from "../ui/status";
import { recipeSummary } from "./recipe-text";

function pct(part: number, whole: number) {
  return whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0;
}

export function RequestCard({ summary, headingLevel = "h3" }: { summary: RequestSummary; headingLevel?: "h2" | "h3" }) {
  const { request, org, totals, phase, deadline, components } = summary;
  const Heading = headingLevel;
  const unitPlural = pluralize(request.unitName).toLowerCase();
  const promised = Math.max(0, totals.promised - totals.accepted);
  return (
    <article className="lift tag-shape relative flex h-full flex-col gap-4 border border-line-strong bg-surface p-5 shadow-card hover:border-forest">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PhaseBadge phase={phase} />
          <span className="text-sm text-muted">{CATEGORY_LABEL[request.category]}</span>
        </div>
        <Heading className="font-serif text-2xl leading-tight font-semibold tracking-tight">
          <AppLink href={`/requests/${request.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
            {request.title}
          </AppLink>
        </Heading>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
          <span>{org.name}</span>
          {org.contactConfirmedAt ? (
            <span className="inline-flex items-center gap-0.5 text-forest">
              <BadgeCheck aria-hidden className="size-4" />
              Contact confirmed
            </span>
          ) : null}
        </p>
      </div>

      <div className="space-y-2">
        <p className="leading-none">
          <span className="tabular font-serif text-4xl font-semibold tracking-tight">{formatCount(totals.available)}</span>{" "}
          <span className="font-semibold">{unitPlural} still open</span>
        </p>
        <div aria-hidden className="flex h-3 overflow-hidden rounded-[2px_10px_10px_2px] border border-line-strong bg-sunken">
          <span className="h-3 bg-forest" style={{ width: `${pct(totals.accepted, totals.target)}%` }} />
          <span className="h-3 bg-forest-500" style={{ width: `${pct(promised, totals.target)}%` }} />
          <span className="h-3 min-w-0 flex-1 bg-sunken" />
        </div>
        <p className="text-sm text-muted">
          {formatCount(totals.accepted)} confirmed
          {promised > 0 ? ` · ${formatCount(promised)} taken by groups, on the way` : ""}
          {" · "}
          {formatCount(totals.target)} requested
        </p>
      </div>

      <p className="sr-only">
        {countNoun(totals.target, request.unitName)} requested, {formatCount(totals.available)} still open for groups to adopt,{" "}
        {formatCount(totals.accepted)} confirmed received.
      </p>
      <p className="text-[0.95rem]">{recipeSummary(request.requestType, request.unitName, components)}</p>

      <div className="mt-auto flex flex-col gap-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="size-4 shrink-0" />
          <span>
            Needed by <span className="font-semibold text-ink">{formatCalendarDate(request.neededBy)}</span>
            {deadline.description && phase !== "fulfilled" && phase !== "cancelled" ? (
              <span className={deadline.passed ? "font-semibold text-amber" : undefined}> · {deadline.description}</span>
            ) : null}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4 shrink-0" />
          {request.location}
        </span>
      </div>
    </article>
  );
}
