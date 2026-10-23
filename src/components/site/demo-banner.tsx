import { FlaskConical } from "lucide-react";
import { exitDemoAction, resetDemoAction, switchPersonaAction } from "@/actions/demo";
import { PERSONAS, type Persona } from "@/server/demo/sandbox";

// Always visible inside the demo, so nobody mistakes sample data for real requests.
export function DemoBanner({ persona }: { persona: Persona }) {
  return (
    <div className="border-b border-clay/30 bg-clay-tint no-print" role="region" aria-label="Demo">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:gap-4">
        <p className="flex items-start gap-2 text-sm text-ink">
          <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-clay" />
          <span>
            <strong className="font-semibold">Demo with sample data.</strong> Only you can see it, and nothing here is real.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <form action={switchPersonaAction} className="flex items-center gap-2">
            <label htmlFor="demo-persona" className="text-sm font-semibold whitespace-nowrap">
              Acting as
            </label>
            <select
              id="demo-persona"
              name="persona"
              defaultValue={persona.key}
              className="min-h-10 max-w-[15rem] rounded-md border border-line-strong bg-surface px-2 text-sm"
            >
              {PERSONAS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.short})
                </option>
              ))}
            </select>
            <button type="submit" className="min-h-10 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-forest hover:bg-forest-tint">
              Switch
            </button>
          </form>
          <form action={resetDemoAction}>
            <button type="submit" className="min-h-10 rounded-md px-3 text-sm font-semibold text-clay underline underline-offset-2 hover:bg-surface/60">
              Reset demo
            </button>
          </form>
          <form action={exitDemoAction}>
            <button type="submit" className="min-h-10 rounded-md px-3 text-sm font-semibold text-ink underline underline-offset-2 hover:bg-surface/60">
              Exit demo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
