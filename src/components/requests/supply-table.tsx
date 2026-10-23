// The recipe and the totals it implies. On small screens each line becomes a
// short stacked list instead of a squeezed table.

import { formatCount } from "@/domain/text";

export interface SupplyRow {
  key: string;
  name: string;
  details: string;
  perUnit: number;
  total: number;
}

export function SupplyTable({
  rows,
  units,
  unitName,
  caption,
  showPerUnit = true,
}: {
  rows: SupplyRow[];
  units: number;
  unitName: string;
  caption: string;
  showPerUnit?: boolean;
}) {
  return (
    <div>
      <table className="hidden w-full border-collapse text-left sm:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Item
            </th>
            {showPerUnit ? (
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                Per {unitName.toLowerCase()}
              </th>
            ) : null}
            <th scope="col" className="py-2 text-right font-semibold">
              Total for {formatCount(units)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-0">
              <th scope="row" className="py-3 pr-4 align-top font-normal">
                <span className="font-semibold">{row.name}</span>
                {row.details ? <span className="block text-sm text-muted">{row.details}</span> : null}
              </th>
              {showPerUnit ? <td className="tabular py-3 pr-4 text-right align-top">{formatCount(row.perUnit)}</td> : null}
              <td className="tabular py-3 text-right align-top font-semibold">{formatCount(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line sm:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={row.key} className="py-3">
            <p className="font-semibold">{row.name}</p>
            {row.details ? <p className="text-sm text-muted">{row.details}</p> : null}
            <p className="mt-1 text-sm">
              {showPerUnit ? (
                <>
                  <span className="tabular font-semibold">{formatCount(row.perUnit)}</span> per {unitName.toLowerCase()} ·{" "}
                </>
              ) : null}
              <span className="tabular font-semibold">{formatCount(row.total)}</span> in total
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
