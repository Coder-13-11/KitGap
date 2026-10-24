"use client";

import { useState } from "react";
import { Backpack, BookOpen, Minus, Pencil, Plus, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/button-class";
import { cn } from "@/components/ui/cn";

const RECIPE = [
  { name: "Backpacks", per: 1, Icon: Backpack },
  { name: "Notebooks", per: 2, Icon: BookOpen },
  { name: "Pencil packs", per: 1, Icon: Pencil },
];

const MIN = 1;
const MAX = 200;
const ORG = "Riverbend Family Center";

// Who acts at each step: the club packs and hands over, then only the
// organization can confirm what arrived.
type Phase = "packing" | "handed_over" | "confirmed";

const HATCH = "repeating-linear-gradient(135deg, var(--color-forest) 0 4px, var(--color-forest-500) 4px 8px)";

/**
 * A labelled example of one drive. Nothing is saved. Packed is not received,
 * handed over is not received; the hole fills only when the organization
 * confirms.
 */
export function DrivePlanner() {
  const [kits, setKits] = useState(20);
  const [ready, setReady] = useState(12);
  const [phase, setPhase] = useState<Phase>("packing");

  const setGoal = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(next) || MIN));
    setKits(clamped);
    setReady((current) => Math.min(current, clamped));
    setPhase("packing");
  };

  const fill = kits > 0 ? (ready / kits) * 100 : 0;
  const barColor = phase === "confirmed" ? "var(--color-forest)" : phase === "handed_over" ? HATCH : "var(--color-forest-500)";
  const caption =
    phase === "confirmed"
      ? `Confirmed by ${ORG}`
      : phase === "handed_over"
        ? `Handed over. Waiting for ${ORG} to confirm.`
        : "Packed by the club. Not yet received.";
  const status =
    phase === "confirmed"
      ? `${ORG} confirmed ${ready} of ${kits} kits. ${kits - ready} still to pack.`
      : phase === "handed_over"
        ? `${ready} of ${kits} kits handed over, waiting for ${ORG} to confirm.`
        : `${ready} of ${kits} kits packed. Not yet received by ${ORG}.`;

  return (
    <section
      aria-labelledby="planner-title"
      className="tag-shape relative border border-line-strong bg-surface p-5 text-ink shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="planner-title" className="font-serif text-2xl font-semibold tracking-tight">
            Lakeside High Service Club
          </h2>
          <p className="mt-1 text-muted">An example drive for {ORG}. Nothing here is saved.</p>
        </div>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2.5 py-1 text-sm font-semibold text-clay">
          Example
        </span>
      </div>

      <div className="mt-5">
        <label htmlFor="planner-kits" className="text-sm font-semibold">
          How many kits will the club make?
        </label>
        <div className="mt-2 flex items-center rounded-md border border-line-strong">
          <button
            type="button"
            onClick={() => setGoal(kits - 1)}
            disabled={kits <= MIN}
            aria-label="One fewer kit"
            className="press grid size-11 place-items-center rounded-l-md hover:bg-sunken disabled:text-line-strong"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <input
            id="planner-kits"
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            value={kits}
            onChange={(event) => setGoal(Number(event.target.value))}
            className="tabular h-11 w-full border-x border-line-strong bg-transparent text-center text-lg font-semibold"
          />
          <button
            type="button"
            onClick={() => setGoal(kits + 1)}
            disabled={kits >= MAX}
            aria-label="One more kit"
            className="press grid size-11 place-items-center rounded-r-md hover:bg-sunken disabled:text-line-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-serif text-4xl leading-none font-semibold tracking-tight">
          <span className="tabular">{ready} of {kits}</span>
        </p>
        <p className="mt-1 font-semibold">{phase === "confirmed" ? "kits confirmed received" : "kits packed"}</p>
        <div aria-hidden className="mt-3 flex h-11 overflow-hidden rounded-[2px_14px_14px_2px] border border-line-strong bg-surface">
          <span className="grid w-11 shrink-0 place-items-center border-r border-line-strong">
            <span className={cn("size-3.5 rounded-full", phase === "confirmed" ? "bg-forest" : "bg-paper ring-2 ring-line-strong")} />
          </span>
          <span className="min-w-0 flex-1 bg-sunken">
            <span className="block h-full transition-[width] duration-300" style={{ width: `${fill}%`, background: barColor }} />
          </span>
        </div>
        <p className={cn("mt-3 text-sm font-semibold", phase === "confirmed" ? "stamp" : "text-ink")} aria-live="polite">
          {caption}
        </p>
        <p className="sr-only">{status}</p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Supply checklist</p>
        <ul className="mt-2 divide-y divide-line rounded-md bg-paper">
          {RECIPE.map(({ name, per, Icon }) => (
            <li key={name} className="flex items-center gap-3 px-3 py-2.5">
              <Icon className="size-4 shrink-0 text-forest" aria-hidden="true" />
              <span className="flex-1 text-sm">{name}</span>
              <span className="tabular text-sm font-semibold">{per} per kit</span>
              <span key={kits * per} className="appear tabular w-10 text-right font-semibold">
                {(kits * per).toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">Bring only what is on this list.</p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {phase === "packing" ? (
          <>
            <p className="text-sm font-semibold text-muted">The club&rsquo;s turn</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPhase("handed_over")} disabled={ready < 1} className={buttonClass("primary")}>
                Hand over {ready} {ready === 1 ? "kit" : "kits"}
              </button>
              <button type="button" onClick={() => setReady(Math.min(kits, ready + 1))} disabled={ready >= kits} className={buttonClass("quiet")}>
                Pack one more
              </button>
            </div>
          </>
        ) : phase === "handed_over" ? (
          <>
            <p className="text-sm font-semibold text-muted">{ORG}&rsquo;s turn. Only they can confirm.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPhase("confirmed")} className={buttonClass("primary")}>
                Confirm {ready} received
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setReady(12);
              setKits(20);
              setPhase("packing");
            }}
            className={buttonClass("secondary")}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Start the example over
          </button>
        )}
      </div>
    </section>
  );
}
