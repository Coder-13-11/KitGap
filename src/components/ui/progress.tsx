// A request's progress as a shipping tag plus the numbers in words. The tag is
// decorative (hidden from screen readers); the sentence carries the meaning.
// The punched hole fills forest only when confirmed receipt is greater than zero.

import type { RequestTotals } from "@/domain/quantities";
import { countNoun, formatCount } from "@/domain/text";
import { cn } from "./cn";

export function RequestProgress({
  totals,
  unitName,
  compact = false,
}: {
  totals: Pick<RequestTotals, "target" | "accepted" | "pendingReview" | "reserved" | "available">;
  unitName: string;
  compact?: boolean;
}) {
  const { target, accepted, pendingReview, reserved, available } = totals;
  const inProgress = Math.max(0, reserved - pendingReview);
  const pct = (n: number) => (target > 0 ? (n / target) * 100 : 0);
  return (
    <div className="space-y-2">
      <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
        <span className="bg-forest" style={{ width: `${pct(accepted)}%` }} />
        <span className="bg-forest-500" style={{ width: `${pct(pendingReview)}%` }} />
        <span className="bg-forest-300" style={{ width: `${pct(inProgress)}%` }} />
      </div>
      <dl className={cn("grid gap-x-5 gap-y-1 text-sm",compact ? "grid-cols-1" : "grid-cols-2")}>
        <Stat swatch="bg-forest" label="Confirmed" value={accepted} />
        <Stat swatch="bg-forest-300" label="Promised" value={reserved} />
        {pendingReview > 0 ? <Stat swatch="bg-forest-500" label="Awaiting review" value={pendingReview} /> : null}
      </dl>
      <p className="sr-only">
        Of {countNoun(target, unitName)}, {formatCount(accepted)} confirmed received, {formatCount(pendingReview)} delivered
        and awaiting review, {formatCount(inProgress)} promised by groups and not yet delivered, and {formatCount(available)} still
        available for new drives.
      </p>
    </div>
  );
}

function Stat({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div aria-hidden className="flex items-baseline gap-2">
      <dt className="flex items-baseline gap-2 text-muted">
        <span className={cn("inline-block size-2.5 shrink-0 translate-y-[-1px] rounded-[2px]", swatch)} />
        {label}
      </dt>
      <dd className="tabular ml-auto text-base font-semibold text-ink">{formatCount(value)}</dd>
    </div>
  );
}
