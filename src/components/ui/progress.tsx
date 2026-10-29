// A request's progress bar plus the numbers in words. The bar is hidden from
// screen readers; the sentence carries the meaning.

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
      <div
        aria-hidden
        className="flex h-8 w-full overflow-hidden rounded-[3px_10px_10px_3px] border border-line-strong bg-sunken"
      >
        <span className="h-8 bg-forest" style={{ width: `${pct(accepted)}%` }} />
        <span
          className="h-8 bg-[repeating-linear-gradient(135deg,var(--color-forest)_0_4px,var(--color-forest-500)_4px_8px)]"
          style={{ width: `${pct(pendingReview)}%` }}
        />
        <span className="h-8 bg-forest-500" style={{ width: `${pct(inProgress)}%` }} />
      </div>
      <dl className={cn("grid gap-x-8 gap-y-1.5 text-sm", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        <Stat swatch="bg-forest" label="Confirmed received" value={accepted} />
        {!compact || pendingReview > 0 ? (
          <Stat
            swatch="bg-[repeating-linear-gradient(135deg,var(--color-forest)_0_3px,var(--color-forest-500)_3px_6px)]"
            label="Delivered, awaiting review"
            value={pendingReview}
          />
        ) : null}
        <Stat swatch="bg-forest-500" label="Promised by groups" value={inProgress} />
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
        <span className={cn("inline-block size-2.5 shrink-0 translate-y-[-1px] rounded-[2px]", swatch)} />
        {label}
      </dt>
      <dd className="tabular ml-auto text-base font-semibold text-ink">{formatCount(value)}</dd>
    </div>
  );
}
