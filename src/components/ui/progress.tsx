// A request's progress as one bar plus the numbers in words. The bar is
// decorative (hidden from screen readers); the sentence carries the meaning.

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
      <div aria-hidden className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken ring-1 ring-line ring-inset">
        <span className="h-full bg-forest" style={{ width: `${pct(accepted)}%` }} />
        <span
          className="h-full bg-[repeating-linear-gradient(135deg,#234d3b_0_4px,#5f8b75_4px_8px)]"
          style={{ width: `${pct(pendingReview)}%` }}
        />
        <span className="h-full bg-[#b9cdbf]" style={{ width: `${pct(inProgress)}%` }} />
      </div>
      <dl className={cn("grid gap-x-8 gap-y-1.5 text-sm", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        <Stat swatch="bg-forest" label="Confirmed received" value={accepted} />
        {!compact || pendingReview > 0 ? (
          <Stat swatch="bg-[repeating-linear-gradient(135deg,#234d3b_0_3px,#5f8b75_3px_6px)]" label="Delivered, awaiting review" value={pendingReview} />
        ) : null}
        <Stat swatch="bg-[#b9cdbf]" label="Promised by groups" value={inProgress} />
        <Stat swatch="bg-sunken ring-1 ring-line-strong ring-inset" label="Still available" value={available} />
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
        <span className={cn("inline-block size-2.5 shrink-0 translate-y-[-1px] rounded-full", swatch)} />
        {label}
      </dt>
      <dd className="tabular ml-auto font-semibold text-ink">{formatCount(value)}</dd>
    </div>
  );
}
