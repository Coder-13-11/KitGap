"use client";

import { Minus, Plus } from "lucide-react";
import { formatCount, pluralize } from "@/domain/text";
import { cn } from "./cn";

const PICKS = [10, 20, 50];

// A whole-number field with one-step buttons and quick picks. The value is a
// string so the field can be empty while someone types.
export function QuantityPicker({
  id,
  name,
  value,
  onChange,
  max,
  unitName,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  unitName: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const n = /^\d+$/.test(value) ? Number(value) : 0;
  const unit = unitName.toLowerCase();
  const set = (next: number) => onChange(String(Math.min(max, Math.max(1, next))));
  const picks = PICKS.filter((p) => p < max);
  if (max <= 500) picks.push(max);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={cn("flex items-center rounded-lg border bg-surface", invalid ? "border-danger" : "border-line-strong")}>
        <button
          type="button"
          onClick={() => set(n - 1)}
          disabled={n <= 1}
          aria-label={`One fewer ${unit}`}
          aria-controls={id}
          className="press grid size-12 place-items-center rounded-l-lg hover:bg-sunken disabled:text-line-strong"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="tabular h-12 w-20 border-x border-line-strong bg-transparent text-center text-lg font-semibold focus-visible:outline-offset-0"
        />
        <button
          type="button"
          onClick={() => set(n + 1)}
          disabled={n >= max}
          aria-label={`One more ${unit}`}
          aria-controls={id}
          className="press grid size-12 place-items-center rounded-r-lg hover:bg-sunken disabled:text-line-strong"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      {picks.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => set(p)}
          aria-pressed={n === p}
          aria-controls={id}
          className={cn(
            "press min-h-12 rounded-[2px_8px_8px_2px] border px-4 text-sm font-semibold transition-colors",
            n === p ? "border-forest bg-forest text-white" : "border-line-strong bg-surface hover:border-forest hover:bg-forest-tint",
          )}
        >
          <span className="sr-only">Choose </span>
          {p === max && !PICKS.includes(p) ? `All ${formatCount(p)}` : formatCount(p)}
          <span className="sr-only"> {p === 1 ? unit : pluralize(unit)}</span>
        </button>
      ))}
    </div>
  );
}
