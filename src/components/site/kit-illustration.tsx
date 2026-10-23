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
      <div className="flex flex-wrap items-center gap-2 text-ink" aria-hidden>
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-2">
            {i > 0 ? <span className="text-xl text-muted">+</span> : null}
            <span className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2">
              <item.icon className="size-5 text-forest" />
              <span className="tabular font-semibold">{item.count}</span>
              <span className="text-sm text-muted">{item.label}</span>
            </span>
          </span>
        ))}
        <span className="text-xl text-muted">=</span>
        <span className="rounded-md bg-forest px-3 py-2 font-semibold text-white">1 kit</span>
      </div>
      <figcaption className="mt-4 text-[0.95rem] text-muted">
        A club that adopts <strong className="text-ink">20 kits</strong> sees exactly what to collect:{" "}
        <strong className="text-ink">20 backpacks, 40 notebooks and 20 pencil packs</strong>.
      </figcaption>
    </figure>
  );
}
