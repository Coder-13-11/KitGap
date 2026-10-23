// Supplies for a drive, item by item: what's needed, what's been collected,
// what's promised, and what nobody has offered yet. Pledges are shown
// separately from collected supplies because a pledge is only a promise.

import type { ComponentProgress } from "@/domain/quantities";
import { countNoun, formatCount } from "@/domain/text";

export function SuppliesTable({ components, committed, unitName, requestType }: { components: ComponentProgress[]; committed: number; unitName: string; requestType: "kit" | "item" }) {
  return (
    <div>
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">Supplies for {countNoun(committed, unitName)}</caption>
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Needed</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Collected</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Pledged, on the way</th>
            <th scope="col" className="py-2 text-right font-semibold">Still needed</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.componentId} className="border-b border-line last:border-0 align-top">
              <th scope="row" className="py-3 pr-3 font-normal">
                <span className="font-semibold">{c.name}</span>
                {requestType === "kit" ? <span className="block text-sm text-muted">{formatCount(c.quantityPerUnit)} per {unitName.toLowerCase()}</span> : null}
                {c.details ? <span className="block text-sm text-muted">{c.details}</span> : null}
              </th>
              <td className="tabular py-3 pr-3 text-right">{formatCount(c.needed)}</td>
              <td className="tabular py-3 pr-3 text-right">
                {formatCount(c.collected)}
                {c.unusable > 0 ? <span className="block text-xs text-muted">+{formatCount(c.unusable)} not usable</span> : null}
                {c.surplus > 0 ? <span className="block text-xs font-semibold text-clay">{formatCount(c.surplus)} extra</span> : null}
              </td>
              <td className="tabular py-3 pr-3 text-right">{formatCount(c.openPledged)}</td>
              <td className="tabular py-3 text-right">
                <span className={c.uncovered > 0 ? "font-semibold text-clay" : "font-semibold text-forest"}>
                  {c.uncovered > 0 ? formatCount(c.uncovered) : "None"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {components.map((c) => (
          <li key={c.componentId} className="py-3">
            <p className="font-semibold">{c.name}</p>
            {c.details ? <p className="text-sm text-muted">{c.details}</p> : null}
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Needed</dt>
              <dd className="tabular text-right">{formatCount(c.needed)}</dd>
              <dt className="text-muted">Collected</dt>
              <dd className="tabular text-right">
                {formatCount(c.collected)}
                {c.surplus > 0 ? <span className="text-clay"> ({formatCount(c.surplus)} extra)</span> : null}
              </dd>
              {c.unusable > 0 ? (
                <>
                  <dt className="text-muted">Not usable</dt>
                  <dd className="tabular text-right">{formatCount(c.unusable)}</dd>
                </>
              ) : null}
              <dt className="text-muted">Pledged, on the way</dt>
              <dd className="tabular text-right">{formatCount(c.openPledged)}</dd>
              <dt className="font-semibold">Still needed</dt>
              <dd className={c.uncovered > 0 ? "tabular text-right font-semibold text-clay" : "tabular text-right font-semibold text-forest"}>
                {c.uncovered > 0 ? formatCount(c.uncovered) : "None"}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        “Still needed” counts what nobody has collected or pledged yet. Pledged items count as collected only once a coordinator records
        them.
      </p>
    </div>
  );
}
