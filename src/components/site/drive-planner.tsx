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

/**
 * A labelled example of one drive. Nothing is saved. "Ready" is packed and
 * not yet received. The hole fills only when the organization confirms.
 */
export function DrivePlanner() {
  const [kits, setKits] = useState(20);
  const [ready, setReady] = useState(12);
  const [confirmed, setConfirmed] = useState(false);

  const setGoal = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(next) || MIN));
    setKits(clamped);
    setReady((current) => Math.min(current, clamped));
    setConfirmed(false);
  };

  const setReadyCount = (next: number) => {
    setReady(Math.min(kits, Math.max(0, next)));
    setConfirmed(false);
  };

  const fill = kits > 0 ? (ready / kits) * 100 : 0;
  const status = confirmed
    ? `The organization confirmed ${ready} of ${kits} kits. ${kits - ready} still to pack.`
    : `${ready} of ${kits} kits ready. Not yet confirmed by the organization.`;

  return (
    <section
      aria-labelledby="planner-title"
      className="tag-shape relative border border-line-strong bg-surface p-5 text-ink shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="planner-title" className="font-serif text-2xl font-semibold tracking-tight">
            Lincoln High Key Club
          </h2>
          <p className="mt-1 text-muted">An example drive. Nothing here is saved.</p>
        </div>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2.5 py-1 text-sm font-semibold text-clay">
          Example
        </span>
      </div>

      <div className="mt-5">
        <label htmlFor="planner-kits" className="text-sm font-semibold">
          How many kits will the group make?
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
        <p className="mt-1 font-semibold">kits ready</p>
        <div aria-hidden className="mt-3 flex h-11 overflow-hidden rounded-[2px_14px_14px_2px] border border-line-strong bg-surface">
          <span className="grid w-11 shrink-0 place-items-center border-r border-line-strong">
            <span className={cn("size-3.5 rounded-full", confirmed ? "bg-forest" : "bg-paper ring-2 ring-line-strong")} />
          </span>
          <span
            className="min-w-0 flex-1"
            style={{
              background: `linear-gradient(90deg, ${confirmed ? "var(--color-forest)" : "var(--color-forest-500)"} ${fill}%, var(--color-sunken) ${fill}%)`,
            }}
          />
        </div>
        <p className={cn("mt-3 text-sm font-semibold", confirmed ? "stamp" : "text-ink")} aria-live="polite">
          {confirmed ? "Confirmed by the organization" : "Not yet confirmed by the organization"}
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

      <div className="mt-5 flex flex-wrap gap-2">
        {confirmed ? (
          <button type="button" onClick={() => { setReady(12); setKits(20); setConfirmed(false); }} className={buttonClass("secondary")}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Start the example over
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setConfirmed(true)} disabled={ready < 1} className={buttonClass("primary")}>
              Confirm these {ready}
            </button>
            <button type="button" onClick={() => setReadyCount(ready + 1)} disabled={ready >= kits} className={buttonClass("quiet")}>
              Pack one more
            </button>
          </>
        )}
      </div>
    </section>
  );
}
