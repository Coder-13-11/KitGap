"use client";

// The first step of starting a drive, on the request page: choose a number
// and see the supply list it implies. Nothing is reserved until the group
// confirms on the next page, where availability is checked again.

import { useState } from "react";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { useBase, withBase } from "../ui/base";
import { buttonClass } from "../ui/button";
import { QuantityPicker } from "../ui/quantity-picker";

export function QuickAdopt({
  requestId,
  available,
  unitName,
  requestType,
  components,
}: {
  requestId: string;
  available: number;
  unitName: string;
  requestType: "kit" | "item";
  components: { id: string; name: string; quantityPerUnit: number }[];
}) {
  const base = useBase();
  const suggested = Math.min(available, requestType === "kit" ? 20 : 25);
  const [value, setValue] = useState(String(suggested));
  const n = /^\d+$/.test(value) ? Number(value) : 0;
  const valid = n >= 1 && n <= available;
  const units = pluralize(unitName).toLowerCase();

  return (
    <form action={withBase(base, `/requests/${requestId}/adopt`)} method="get" className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quick-quantity" className="font-semibold">
          How many {units} can your group take on?
        </label>
        <p id="quick-quantity-hint" className="text-sm text-muted">
          Between 1 and {formatCount(available)}. You can start small and add more later if some are still available.
        </p>
      </div>
      <QuantityPicker
        id="quick-quantity"
        name="quantity"
        value={value}
        onChange={setValue}
        max={available}
        unitName={unitName}
        invalid={Boolean(value && !valid)}
        describedBy="quick-quantity-hint quick-quantity-preview"
      />
      <div id="quick-quantity-preview" aria-live="polite" className="rounded-lg bg-sunken px-3 py-2.5 text-sm">
        {valid ? (
          requestType === "kit" ? (
            <>
              <p className="font-semibold">Your group would collect:</p>
              <ul className="mt-1 space-y-0.5">
                {components.map((c) => (
                  <li key={c.id} className="tabular">
                    {countNoun(c.quantityPerUnit * n, c.name)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              Your group would collect <strong className="tabular">{countNoun(n, unitName)}</strong>.
            </p>
          )
        ) : (
          <p className="font-semibold text-danger">Enter a whole number from 1 to {formatCount(available)}.</p>
        )}
      </div>
      <button type="submit" className={buttonClass("primary", "md", true)} disabled={!valid}>
        Start a drive for {valid ? countNoun(n, unitName) : units}
      </button>
    </form>
  );
}
