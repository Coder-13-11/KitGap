import { Backpack, BookOpen, Check, Pencil } from "lucide-react";
import { VerifiedStamp } from "../ui/confirmation";

// What KitGap is, as one picture: a club's drive for a shelter's list, what
// has been collected, and how many kits the shelter confirmed. An example,
// labelled as one.

const ITEMS = [
  { name: "Backpacks", have: 20, need: 20, Icon: Backpack },
  { name: "Notebooks", have: 40, need: 40, Icon: BookOpen },
  { name: "Pencil packs", have: 16, need: 20, Icon: Pencil },
];

const CONFIRMED = 14;
const KITS = 20;

export function DriveSnapshot() {
  return (
    <figure className="tag-shape border border-line-strong bg-surface p-5 shadow-card sm:p-6" aria-labelledby="snapshot-caption">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-xl font-semibold tracking-tight">School-supply kits</p>
          <p className="text-sm text-muted">Lakeside High Service Club → Riverbend Family Center</p>
        </div>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2 py-0.5 text-xs font-semibold text-clay">
          Example
        </span>
      </div>

      <ul className="mt-5 space-y-3">
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

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-end justify-between gap-3">
          <p>
            <span className="tabular font-serif text-4xl leading-none font-semibold">
              {CONFIRMED} of {KITS}
            </span>
            <span className="mt-1 block text-sm font-semibold">kits confirmed by the shelter</span>
          </p>
          <VerifiedStamp className="shrink-0" />
        </div>
        <span aria-hidden className="mt-3 block h-2.5 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full rounded-full bg-forest" style={{ width: `${(CONFIRMED / KITS) * 100}%` }} />
        </span>
      </div>
      <figcaption id="snapshot-caption" className="sr-only">
        Example drive: a club collecting 20 school-supply kits for a family center. Backpacks and notebooks are all collected, 16 of
        20 pencil packs are in, and the family center has confirmed receiving 14 of the 20 kits.
      </figcaption>
    </figure>
  );
}
