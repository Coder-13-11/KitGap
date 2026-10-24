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
    <figure className="rounded-xl bg-surface p-5 text-ink shadow-card sm:p-6">
      <div aria-hidden>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2.5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-forest-tint text-forest">
                <item.icon className="size-5 shrink-0" />
              </span>
              <span className="tabular w-6 text-right text-2xl font-semibold">{item.count}</span>
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl text-muted">=</span>
          <span className="rounded-lg bg-forest px-4 py-2 text-lg font-semibold text-white">1 school-supply kit</span>
        </div>
      </div>
      <figcaption className="mt-4 text-[0.95rem] text-muted">
        A club that adopts <strong className="text-ink">20 kits</strong> sees exactly what to collect:{" "}
        <strong className="text-ink">20 backpacks, 40 notebooks and 20 pencil packs</strong>.
      </figcaption>
    </figure>
  );
}
