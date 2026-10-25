"use client";

import { ArrowRight, Check, ChevronDown, FlaskConical } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { demoGuideAction, exitDemoAction, resetDemoAction, switchPersonaAction } from "@/actions/demo";
import type { Persona } from "@/server/demo/sandbox";
import type { DemoGuide } from "@/server/queries/demo-guide";
import { cn } from "../ui/cn";

type PersonaSummary = Pick<Persona, "key" | "name" | "short">;

// Always visible inside the demo, so nobody mistakes sample data for real
// requests. It doubles as a guided tour: one next step, with a button that
// switches to the right sample person and opens the right page.
export function DemoBanner({
  persona,
  personas,
  guide: initialGuide,
}: {
  persona: PersonaSummary;
  personas: PersonaSummary[];
  guide: DemoGuide | null;
}) {
  // The root layout doesn't re-render on every navigation, so check the
  // sandbox again whenever the page changes; that's when a step may have happened.
  const pathname = usePathname();
  const [guide, setGuide] = useState(initialGuide);
  // A form that refreshes the page in place re-renders the layout with fresh
  // progress; take it.
  const [seen, setSeen] = useState(initialGuide);
  if (initialGuide !== seen) {
    setSeen(initialGuide);
    setGuide(initialGuide);
  }
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    panel.current?.removeAttribute("open");
    let live = true;
    demoGuideAction()
      .then((next) => {
        if (live && next) setGuide(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);

  const steps = guide?.steps ?? [];
  const current = guide ? Math.min(guide.current, steps.length - 1) : -1;
  const next = current >= 0 ? steps[current] : null;
  const complete = guide?.complete ?? false;

  return (
    <div className="border-b border-clay/30 bg-clay-tint no-print" role="region" aria-label="Demo guide">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FlaskConical aria-hidden className="size-4 shrink-0 text-clay" />
          <span>
            Demo<span className="hidden sm:inline">, sample data only</span>
          </span>
        </p>

        {next ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ol aria-label="Tour progress" className="hidden shrink-0 items-center gap-1 sm:flex">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span
                    className={cn(
                      "block h-1.5 w-5 rounded-full transition-colors duration-500",
                      s.done || (complete && i === steps.length - 1) ? "bg-forest" : i === current ? "bg-clay" : "bg-line",
                    )}
                  />
                  <span className="sr-only">
                    Step {i + 1}: {s.title}
                    {s.done ? " (done)" : i === current ? " (next)" : ""}
                  </span>
                </li>
              ))}
            </ol>
            <p className="min-w-0 truncate text-sm">
              {complete && current === steps.length - 1 ? (
                <span className="kg-stamp stamp mr-2 hidden text-xs sm:inline-flex">Confirmed</span>
              ) : null}
              {complete && current === steps.length - 1 ? (
                <span className="tabular mr-1.5 font-semibold text-forest sm:hidden">Done</span>
              ) : (
                <span className="tabular mr-1.5 font-semibold text-clay">
                  {current + 1}/{steps.length}
                </span>
              )}
              <span className="font-semibold">{next.title}</span>
              <span className="hidden text-muted md:inline"> · as {next.who}</span>
            </p>
            <form action={switchPersonaAction} className="ml-auto shrink-0">
              <input type="hidden" name="persona" value={next.persona} />
              <input type="hidden" name="next" value={next.href} />
              <button
                type="submit"
                className="press inline-flex min-h-9 items-center gap-1.5 rounded-[2px_8px_8px_2px] bg-forest px-3 text-sm font-semibold text-white hover:bg-forest-dark"
              >
                {persona.key === next.persona ? "Go" : `Go as ${next.who.split(",")[0]}`}
                <ArrowRight aria-hidden className="size-4" />
              </button>
            </form>
          </div>
        ) : null}

        <details ref={panel} className="group relative shrink-0">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-sm font-semibold text-ink hover:bg-surface/60 [&::-webkit-details-marker]:hidden">
            All steps
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="kg-slide absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[2px_14px_14px_2px] border border-line-strong bg-surface p-4 shadow-card">
            <p className="text-sm text-muted">
              You&rsquo;re acting as <strong className="font-semibold text-ink">{persona.name}</strong> ({persona.short}). Each step switches to
              the right person for you.
            </p>
            <ol className="mt-3 space-y-1">
              {steps.map((s, i) => {
                const done = s.done || (complete && i === steps.length - 1);
                return (
                  <li key={s.title}>
                    <form action={switchPersonaAction}>
                      <input type="hidden" name="persona" value={s.persona} />
                      <input type="hidden" name="next" value={s.href} />
                      <button
                        type="submit"
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-sunken",
                          i === current && !complete && "bg-clay-tint",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                            done ? "bg-forest text-white" : "bg-paper text-ink ring-1 ring-line-strong",
                          )}
                        >
                          {done ? <Check className="size-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">
                            {s.title}
                            {done ? <span className="sr-only"> (done)</span> : null}
                          </span>
                          <span className="block text-sm text-muted">
                            {s.who}. {s.hint}
                          </span>
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ol>
            <form action={switchPersonaAction} className="mt-4 flex items-center gap-2 border-t border-line pt-3">
              <label htmlFor="demo-persona" className="text-sm font-semibold whitespace-nowrap">
                Act as
              </label>
              <select
                id="demo-persona"
                name="persona"
                defaultValue={persona.key}
                className="min-h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 text-sm"
              >
                {personas.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.short})
                  </option>
                ))}
              </select>
              <button type="submit" className="min-h-10 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-forest hover:bg-forest-tint">
                Switch
              </button>
            </form>
            <div className="mt-2 flex gap-2">
              <form action={resetDemoAction}>
                <button type="submit" className="min-h-10 rounded-md px-2 text-sm font-semibold text-clay underline underline-offset-2 hover:bg-clay-tint">
                  Start over
                </button>
              </form>
              <form action={exitDemoAction}>
                <button type="submit" className="min-h-10 rounded-md px-2 text-sm font-semibold text-ink underline underline-offset-2 hover:bg-sunken">
                  Exit demo
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
