import { Backpack, BookOpen, Pencil } from "lucide-react";

const ITEMS = [
  { name: "Backpacks", count: 20, Icon: Backpack },
  { name: "Notebooks", count: 40, Icon: BookOpen },
  { name: "Pencil packs", count: 20, Icon: Pencil },
];

// A sample request shown only when nothing live is listed. It is not a link.
export function ExampleRequest() {
  return (
    <article aria-labelledby="example-request-title" className="tag-shape border border-line-strong bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p id="example-request-title" className="font-serif text-2xl font-semibold tracking-tight">
          Weekend hygiene kits
        </p>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2.5 py-1 text-sm font-semibold text-clay">
          Example
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">Example organization · not a live request</p>
      <p className="mt-4 font-serif text-4xl leading-none font-semibold tracking-tight">
        <span className="tabular">12 of 20</span>
      </p>
      <p className="mt-1 font-semibold">kits ready</p>
      <div aria-hidden className="mt-3 flex h-11 overflow-hidden rounded-[2px_14px_14px_2px] border border-line-strong bg-surface">
        <span className="grid w-11 shrink-0 place-items-center border-r border-line-strong">
          <span className="size-3.5 rounded-full bg-paper ring-2 ring-line-strong" />
        </span>
        <span
          className="min-w-0 flex-1"
          style={{ background: "linear-gradient(90deg, var(--color-forest-500) 60%, var(--color-sunken) 60%)" }}
        />
      </div>
      <p className="mt-3 text-sm font-semibold">Not yet confirmed by the organization</p>
      <ul className="mt-4 divide-y divide-line rounded-md bg-paper">
        {ITEMS.map(({ name, count, Icon }) => (
          <li key={name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <Icon className="size-4 shrink-0 text-forest" aria-hidden="true" />
            <span className="flex-1">{name}</span>
            <span className="tabular font-semibold">{count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">Bring only what is on the list. This sample is not open for a drive.</p>
    </article>
  );
}
