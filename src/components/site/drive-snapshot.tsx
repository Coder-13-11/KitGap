import { Check, Milk, Soup, Wheat } from "lucide-react";
import { VerifiedStamp } from "../ui/confirmation";

// What KitGap is, as one picture: a food pantry's list, what neighbors have
// brought so far, and how many bags the pantry confirmed. An example,
// labelled as one.

const ITEMS = [
  { name: "Canned soup", have: 40, need: 40, Icon: Soup },
  { name: "Bags of rice", have: 20, need: 20, Icon: Wheat },
  { name: "Shelf-stable milk", have: 16, need: 20, Icon: Milk },
];

const CONFIRMED = 14;
const KITS = 20;

export function DriveSnapshot() {
  return (
    <figure className="tag-shape border border-line-strong bg-surface p-4 shadow-card sm:p-6" aria-labelledby="snapshot-caption">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold tracking-tight sm:text-xl">Weekend food bags</p>
          <p className="text-sm text-muted">Westside Food Pantry · Kissimmee, FL</p>
        </div>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2 py-0.5 text-xs font-semibold text-clay">
          Example
        </span>
      </div>

      <ul className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
        {ITEMS.map(({ name, have, need, Icon }) => {
          const done = have >= need;
          return (
            <li key={name} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
              <Icon aria-hidden className="size-5 text-forest" />
              <span className="font-semibold">{name}</span>
              <span className="tabular flex items-center gap-1 text-sm font-semibold">
                {done ? <Check aria-hidden className="size-4 text-forest" /> : null}
                {have}/{need}
              </span>
              <span aria-hidden className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-sunken">
                <span className="block h-full rounded-full bg-forest-500" style={{ width: `${(have / need) * 100}%` }} />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-line pt-4 sm:mt-6 sm:pt-5">
        <div className="flex items-end justify-between gap-3">
          <p>
            <span className="tabular font-serif text-3xl leading-none font-semibold sm:text-4xl">
              {CONFIRMED} of {KITS}
            </span>
            <span className="mt-1 block text-sm font-semibold">bags confirmed by the pantry</span>
          </p>
          <VerifiedStamp className="shrink-0" />
        </div>
        <span aria-hidden className="mt-3 block h-2.5 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full rounded-full bg-forest" style={{ width: `${(CONFIRMED / KITS) * 100}%` }} />
        </span>
      </div>
      <figcaption id="snapshot-caption" className="sr-only">
        Example need: a food pantry asking for 20 weekend food bags. All the soup and rice has been brought, 16 of 20 cartons of milk
        are in, and the pantry has confirmed receiving 14 of the 20 bags.
      </figcaption>
    </figure>
  );
}
