import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { formatCalendarDate } from "@/domain/dates";
import { CATEGORY_LABEL } from "@/domain/phase";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import type { RequestSummary } from "@/server/queries/requests";
import { AppLink } from "../ui/base";
import { PhaseBadge } from "../ui/status";
import { recipeSummary } from "./recipe-text";

export function RequestCard({ summary, headingLevel = "h3" }: { summary: RequestSummary; headingLevel?: "h2" | "h3" }) {
  const { request, org, totals, phase, deadline, components } = summary;
  const Heading = headingLevel;
  const unitPlural = pluralize(request.unitName).toLowerCase();
  return (
    <article className="relative flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PhaseBadge phase={phase} />
        <span className="text-sm text-muted">{CATEGORY_LABEL[request.category]}</span>
      </div>
      <div className="space-y-1">
        <Heading className="text-lg leading-snug font-semibold">
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
      <p className="text-[0.95rem] text-ink">{recipeSummary(request.requestType, request.unitName, components)}</p>
      <dl aria-hidden className="grid grid-cols-3 gap-2 rounded-md bg-sunken px-3 py-2.5 text-center">
        <div>
          <dt className="text-xs font-semibold text-muted">Requested</dt>
          <dd className="tabular text-lg leading-tight font-semibold">
            {formatCount(totals.target)}
            <span className="block text-xs font-normal text-muted">{totals.target === 1 ? request.unitName.toLowerCase() : unitPlural}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Open to adopt</dt>
          <dd className="tabular text-lg leading-tight font-semibold">
            {formatCount(totals.available)}
            <span className="block text-xs font-normal text-muted">{totals.available === 1 ? request.unitName.toLowerCase() : unitPlural}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Received</dt>
          <dd className="tabular text-lg leading-tight font-semibold">
            {formatCount(totals.accepted)}
            <span className="block text-xs font-normal text-muted">{totals.accepted === 1 ? request.unitName.toLowerCase() : unitPlural}</span>
          </dd>
        </div>
      </dl>
      <p className="sr-only">
        {countNoun(totals.target, request.unitName)} requested, {formatCount(totals.available)} still open for groups to adopt,{" "}
        {formatCount(totals.accepted)} confirmed received.
      </p>
      <div className="mt-auto flex flex-col gap-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="size-4 shrink-0" />
          <span>
            Needed by <span className="font-semibold text-ink">{formatCalendarDate(request.neededBy)}</span>
            {deadline.description && phase !== "fulfilled" && phase !== "cancelled" ? (
              <span className={deadline.passed ? "text-amber" : undefined}> · {deadline.description}</span>
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
