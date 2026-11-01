import { ArrowUpRight, BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { formatCalendarDate } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import type { RequestSummary } from "@/server/queries/requests";
import { AppLink } from "../ui/base";
import { CategoryBadge } from "../ui/category";
import { PhaseBadge } from "../ui/status";
import { recipeSummary } from "./recipe-text";

export function RequestCard({ summary, headingLevel = "h3" }: { summary: RequestSummary; headingLevel?: "h2" | "h3" }) {
  const { request, org, totals, phase, deadline, components } = summary;
  const Heading = headingLevel;
  const promised = Math.max(0, totals.reserved);
  const percent = (n: number) => totals.target ? Math.min(100, n / totals.target * 100) : 0;
  return <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-forest">
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
      <CategoryBadge category={request.category} />
      {phase === "open" && deadline.soon ? <span className="text-sm font-semibold text-clay">{deadline.description}</span> : <PhaseBadge phase={phase} />}
    </div>
    <div className="flex flex-1 flex-col p-5">
      <Heading className="font-serif text-2xl font-semibold leading-tight">
        <AppLink href={`/requests/${request.id}`} className="text-ink no-underline after:absolute after:inset-0 group-hover:underline">
          {phase === "open" ? `${countNoun(totals.available, request.unitName)} still unclaimed` : request.title}
        </AppLink>
      </Heading>
      {phase === "open" ? <p className="mt-2 text-muted">{request.title}</p> : null}
      <p className="mt-4 flex items-start gap-1.5 text-sm font-semibold">
        {org.contactConfirmedAt ? <BadgeCheck className="mt-0.5 size-4 shrink-0 text-forest" aria-label="Organization contact confirmed" /> : null}
        {org.name}
      </p>
      <p className="mt-3 text-sm text-muted">{recipeSummary(request.requestType, request.unitName, components)}</p>
      <div className="mt-auto pt-6">
        <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-sunken">
          <span className="bg-forest" style={{ width: `${percent(totals.accepted)}%` }} />
          <span className="bg-forest-300" style={{ width: `${percent(promised)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">{formatCount(totals.accepted)} confirmed · {formatCount(promised)} promised · {formatCount(totals.target)} requested</p>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
          <div className="space-y-1 text-sm text-muted">
            <p className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0" aria-hidden />{request.location}</p>
            <p className="flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0" aria-hidden />By {formatCalendarDate(request.neededBy)}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-forest-tint text-forest" aria-hidden><ArrowUpRight className="size-5" /></span>
        </div>
      </div>
    </div>
  </article>;
}

