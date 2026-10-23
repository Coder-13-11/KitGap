import { Backpack, NotebookTabs, PencilLine } from "lucide-react";

// An illustration that is also the core idea: a request's recipe times a
// quantity gives the exact supply list.
export function KitEquation() {
  const items = [
    { icon: Backpack, count: 1, label: "backpack" },
    { icon: NotebookTabs, count: 2, label: "notebooks" },
    { icon: PencilLine, count: 1, label: "pencil pack" },
  ];
  return (
    <figure className="rounded-lg border border-line bg-surface p-5">
      <div className="text-ink" aria-hidden>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-2">
              <item.icon className="size-5 shrink-0 text-forest" />
              <span className="tabular w-6 text-right text-lg font-semibold">{item.count}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-3 border-t border-line pt-3">
          <span className="text-lg text-muted">=</span>
          <span className="rounded-md bg-forest px-3 py-1.5 font-semibold text-white">1 school-supply kit</span>
        </div>
      </div>
      <figcaption className="mt-4 text-[0.95rem] text-muted">
        A club that adopts <strong className="text-ink">20 kits</strong> sees exactly what to collect:{" "}
        <strong className="text-ink">20 backpacks, 40 notebooks and 20 pencil packs</strong>.
      </figcaption>
    </figure>
  );
}
