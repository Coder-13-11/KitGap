// Where every unit of a drive is right now. The stages never overlap, so
// they add up to the units that exist plus the ones still to pack/collect.

import type { UnitStages } from "@/domain/quantities";
import { countNoun, formatCount } from "@/domain/text";
import { cn } from "../ui/cn";

export function StageSummary({ stages, committed, requestType, unitName }: { stages: UnitStages; committed: number; requestType: "kit" | "item"; unitName: string }) {
  const isKit = requestType === "kit";
  const rows = [
    { key: "accepted", label: "Confirmed received", value: stages.accepted, swatch: "bg-forest" },
    { key: "pending", label: "Delivered, awaiting review", value: stages.pendingReview, swatch: "bg-[repeating-linear-gradient(135deg,#234d3b_0_3px,#5f8b75_3px_6px)]" },
    { key: "ready", label: isKit ? "Packed, ready to hand over" : "Collected, ready to hand over", value: stages.ready, swatch: "bg-[#8fb19f]" },
    { key: "followup", label: "Not accepted, needs follow-up", value: stages.needsFollowUp, swatch: "bg-clay" },
    { key: "tobuild", label: isKit ? "Still to pack" : "Still to collect", value: stages.toBuild, swatch: "bg-sunken ring-1 ring-line-strong ring-inset" },
  ];
  const total = Math.max(committed, stages.accepted + stages.pendingReview + stages.ready + stages.needsFollowUp + stages.toBuild);
  return (
    <div className="space-y-3">
      <div aria-hidden className="flex h-4 w-full overflow-hidden rounded-full bg-sunken ring-1 ring-line ring-inset">
        {rows.slice(0, 4).map((r) => (
          <span key={r.key} className={cn("h-full", r.swatch)} style={{ width: `${total ? (r.value / total) * 100 : 0}%` }} />
        ))}
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-baseline gap-2">
            <dt className="flex items-baseline gap-2 text-muted">
              <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", r.swatch)} />
              {r.label}
            </dt>
            <dd className="tabular ml-auto text-lg font-semibold">{formatCount(r.value)}</dd>
          </div>
        ))}
      </dl>
      {stages.setAside > 0 ? (
        <p className="text-sm text-muted">{countNoun(stages.setAside, unitName)} set aside after not being accepted (kept in the history).</p>
      ) : null}
      {stages.surplusUnits > 0 ? (
        <p className="text-sm text-muted">
          {countNoun(stages.surplusUnits, unitName)} beyond this drive's commitment. They don't count toward the request; consider offering
          them to the organization or another drive.
        </p>
      ) : null}
    </div>
  );
}
