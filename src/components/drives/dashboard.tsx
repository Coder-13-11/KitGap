// The top of a drive page: how far along it is, in a ring and one plain
// sentence, the one thing to do now, and the whole drive as a checklist.

import { ArrowDown, Check } from "lucide-react";
import type { ChecklistStep } from "@/domain/guidance";
import type { UnitStages } from "@/domain/quantities";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";
import { ProgressRing } from "../ui/motion";

export function DriveHero({
  stages,
  committed,
  unitName,
  groupName,
  orgName,
  viewer,
  action,
}: {
  stages: UnitStages;
  committed: number;
  unitName: string;
  groupName: string;
  orgName: string;
  viewer: "coordinator" | "contributor" | "organization";
  action: { eyebrow: string; title: string; detail: string; href?: string; label?: string } | null;
}) {
  const remaining = Math.max(0, committed - stages.accepted);
  const promise =
    viewer === "organization"
      ? `${groupName} is making ${countNoun(committed, unitName)} for you.`
      : `${groupName} promised ${orgName} ${countNoun(committed, unitName)}.`;
  const sofar =
    remaining === 0
      ? "Every one of them arrived and was checked."
      : stages.accepted === 0
        ? `None have been confirmed yet. ${formatCount(remaining)} to go.`
        : `${formatCount(stages.accepted)} arrived and ${stages.accepted === 1 ? "was" : "were"} checked. ${formatCount(remaining)} to go.`;
  const pct = committed > 0 ? Math.round((Math.min(stages.accepted, committed) / committed) * 100) : 0;

  return (
    <section aria-labelledby="drive-glance" className="overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-card">
      <h2 id="drive-glance" className="sr-only">
        At a glance
      </h2>
      <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-5 md:flex-1">
          <ProgressRing value={stages.accepted} max={committed} size={120} stroke={12} className="shrink-0">
            <span aria-hidden>
              <span className="tabular block font-serif text-3xl leading-none font-semibold">{pct}%</span>
              <span className="mt-1 block text-xs text-muted">confirmed</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold sm:text-lg">{promise}</p>
            <p className="text-muted">{sofar}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center md:w-80 md:shrink-0">
          <Count label="ready to hand over" value={stages.ready} />
          <Count label="waiting for a check" value={stages.pendingReview} />
          <Count label="confirmed" value={stages.accepted} strong />
        </dl>
      </div>
      {action ? (
        <div className="border-t border-forest/20 bg-forest-tint px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-forest-dark">{action.eyebrow}</p>
              <h2 className="font-serif text-2xl font-semibold">{action.title}</h2>
              {action.detail ? <p>{action.detail}</p> : null}
            </div>
            {action.href && action.label ? (
              <a href={action.href} className={cn(buttonClass("primary"), "shrink-0 gap-2")}>
                {action.label} <ArrowDown aria-hidden className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function NextStepCard({
  title,
  detail,
  href,
  label,
}: {
  title: string;
  detail: string;
  href?: string;
  label?: string;
}) {
  return (
    <section id="next-step" aria-labelledby="next-step-title" className="tag-shape bg-forest px-5 py-5 text-white sm:px-6 sm:py-6">
      <h2 id="next-step-title" className="max-w-[28ch] font-serif text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {detail ? <p className="mt-2 max-w-prose text-on-forest">{detail}</p> : null}
      {href && label ? (
        <a href={href} className={cn(buttonClass("inverse"), "mt-4 gap-2")}>
          {label} <ArrowDown aria-hidden className="size-4" />
        </a>
      ) : null}
    </section>
  );
}

export function KitsReadyMark({
  stages,
  committed,
  unitName,
  requestType,
}: {
  stages: UnitStages;
  committed: number;
  unitName: string;
  requestType: "kit" | "item";
}) {
  const units = pluralize(unitName).toLowerCase();
  const accounted = stages.accepted + stages.pendingReview + stages.ready;
  const scale = committed > 0 && accounted > committed ? committed / accounted : 1;
  const width = (n: number) => (committed > 0 ? (n * scale * 100) / committed : 0);
  const still = requestType === "kit" ? "pack" : "collect";
  const facts = [
    `${countNoun(stages.accepted, unitName)} confirmed`,
    stages.pendingReview > 0 ? `${countNoun(stages.pendingReview, unitName)} awaiting review` : null,
    `${countNoun(stages.toBuild, unitName)} still to ${still}`,
    stages.needsFollowUp > 0 ? `${countNoun(stages.needsFollowUp, unitName)} not accepted` : null,
    stages.surplusUnits > 0 ? `${countNoun(stages.surplusUnits, unitName)} beyond this drive` : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section aria-labelledby="kits-ready-title" className="tag-shape border border-line-strong bg-surface px-5 py-5 shadow-card sm:px-6 sm:py-6">
      <h2 id="kits-ready-title" className="font-serif text-4xl leading-none font-semibold tracking-tight">
        <span className="tabular">
          {formatCount(stages.ready)} of {formatCount(committed)}
        </span>
        <span className="mt-1 block font-sans text-base font-semibold tracking-normal">{units} ready</span>
      </h2>
      <div aria-hidden className="mt-4 flex h-11 overflow-hidden rounded-[2px_14px_14px_2px] border border-line-strong bg-surface">
        <span className="grid h-11 w-11 shrink-0 place-items-center border-r border-line-strong">
          <span className={cn("size-3.5 rounded-full", stages.accepted > 0 ? "bg-forest" : "bg-paper ring-2 ring-line-strong")} />
        </span>
        <span className="flex h-11 min-w-0 flex-1">
          <span className="h-11 bg-forest" style={{ width: `${width(stages.accepted)}%` }} />
          <span
            className="h-11 bg-[repeating-linear-gradient(135deg,var(--color-forest)_0_4px,var(--color-forest-500)_4px_8px)]"
            style={{ width: `${width(stages.pendingReview)}%` }}
          />
          <span className="h-11 bg-forest-500" style={{ width: `${width(stages.ready)}%` }} />
          <span className="h-11 min-w-0 flex-1 bg-sunken" />
        </span>
      </div>
      <p className="mt-3 max-w-prose text-muted">{facts.join(". ")}.</p>
    </section>
  );
}

export function DriveSectionNav({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Drive sections" className="sticky top-16 z-20 -mx-4 border-y border-line bg-paper px-4 no-print sm:-mx-6 sm:px-6">
      <ul className="flex gap-1 overflow-x-auto">
        {links.map((link) => (
          <li key={link.href} className="shrink-0">
            <a href={link.href} className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold whitespace-nowrap text-ink no-underline hover:bg-sunken">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Count({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex flex-col-reverse rounded-xl px-2 py-3", strong ? "bg-forest text-white" : "bg-sunken")}>
      <dt className={cn("mt-1 text-xs", strong ? "text-white/90" : "text-muted")}>{label}</dt>
      <dd className="tabular font-serif text-2xl leading-none font-semibold">{formatCount(value)}</dd>
    </div>
  );
}

const STEP_HREF: Record<ChecklistStep["key"], string> = {
  share: "#share",
  pledge: "#supplies",
  collect: "#record",
  pack: "#pack",
  deliver: "#deliver",
  confirm: "#deliveries",
};

export function DriveChecklist({ steps, linked }: { steps: ChecklistStep[]; linked: boolean }) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  return (
    <section aria-labelledby="checklist-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-title" className="text-xl font-semibold">
          Your drive, step by step
        </h2>
        <p className="text-sm text-muted">
          {formatCount(doneCount)} of {formatCount(steps.length)} done
        </p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, i) => {
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  step.status === "done" ? "bg-forest text-white" : step.status === "current" ? "bg-ink text-white" : "bg-sunken text-muted",
                )}
              >
                {step.status === "done" ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{step.title}</span>
                <span className="block text-sm text-muted">{step.detail}</span>
              </span>
              <span className="sr-only">{step.status === "done" ? "(done)" : step.status === "current" ? "(do this now)" : "(later)"}</span>
            </>
          );
          const box = cn(
            "flex h-full items-start gap-3 rounded-xl border px-4 py-3",
            step.status === "current" ? "border-ink/40 bg-surface shadow-card ring-2 ring-ink/10" : "border-line/80 bg-surface",
          );
          return (
            <li key={step.key} aria-current={step.status === "current" ? "step" : undefined}>
              {linked && step.status !== "done" ? (
                <a href={STEP_HREF[step.key]} className={cn(box, "no-underline transition-colors hover:border-forest/50")}>
                  {body}
                </a>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
