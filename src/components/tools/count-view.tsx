"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Detection } from "@/lib/vision/count";

export interface Mark {
  x: number;
  y: number;
}

// The photo with a numbered box on everything counted. Tap a box to take it
// out; tap an empty spot to add one the counter missed. The minus and plus
// buttons do the same for keyboards and screen readers.
export function CountView({
  url,
  width,
  height,
  kept,
  noun,
  onChange,
}: {
  url: string;
  width: number;
  height: number;
  kept: Detection[];
  noun: string;
  onChange?: (count: number) => void;
}) {
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Mark[]>([]);
  const count = kept.length - removed.size + added.length;
  const r = Math.max(width, height) * 0.022;

  const update = (nextRemoved: Set<number>, nextAdded: Mark[]) => {
    setRemoved(nextRemoved);
    setAdded(nextAdded);
    onChange?.(kept.length - nextRemoved.size + nextAdded.length);
  };

  const tap = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const dot = added.findIndex((m) => Math.hypot(m.x - x, m.y - y) < r * 1.6);
    if (dot >= 0) return update(removed, added.filter((_, i) => i !== dot));
    const hits = kept
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => x >= d.box.xmin && x <= d.box.xmax && y >= d.box.ymin && y <= d.box.ymax)
      .sort((a, b) => area(a.d) - area(b.d));
    if (hits.length) {
      const next = new Set(removed);
      if (next.has(hits[0].i)) next.delete(hits[0].i);
      else next.add(hits[0].i);
      return update(next, added);
    }
    update(removed, [...added, { x, y }]);
  };

  const minus = () => {
    if (added.length) return update(removed, added.slice(0, -1));
    const last = [...kept.keys()].reverse().find((i) => !removed.has(i));
    if (last !== undefined) update(new Set(removed).add(last), added);
  };
  const plus = () => {
    if (removed.size) {
      const next = new Set(removed);
      next.delete([...removed].at(-1)!);
      return update(next, added);
    }
    update(removed, [...added, { x: width / 2, y: height / 2 }]);
  };

  let n = 0;
  return (
    <div className="space-y-4">
      <div className="flex justify-center overflow-hidden rounded-2xl bg-ink shadow-card">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local photo from this device, not a page asset */}
          <img src={url} alt={`Your photo, with ${count} ${noun} marked`} className="block max-h-[70vh] w-auto max-w-full select-none" draggable={false} />
          <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 size-full cursor-crosshair touch-manipulation" onClick={tap} aria-hidden="true">
            {kept.map((d, i) => {
              const off = removed.has(i);
              const label = off ? null : ++n;
              const b = d.box;
              return (
                <g key={i} className="pop" style={{ animationDelay: `${Math.min(i, 30) * 40}ms` }}>
                  <rect
                    x={b.xmin}
                    y={b.ymin}
                    width={Math.max(1, b.xmax - b.xmin)}
                    height={Math.max(1, b.ymax - b.ymin)}
                    rx={r * 0.4}
                    fill={off ? "rgb(0 0 0 / 0.35)" : "rgb(35 77 59 / 0.12)"}
                    stroke={off ? "#ffffff" : "#ffd166"}
                    strokeWidth={r * 0.22}
                    strokeDasharray={off ? `${r * 0.6} ${r * 0.4}` : undefined}
                  />
                  {label ? (
                    <>
                      <circle cx={b.xmin + r} cy={b.ymin + r} r={r} fill="#234d3b" stroke="#fff" strokeWidth={r * 0.15} />
                      <text x={b.xmin + r} y={b.ymin + r} dy="0.35em" textAnchor="middle" fontSize={r * 1.1} fontWeight="700" fill="#fff">
                        {label}
                      </text>
                    </>
                  ) : (
                    <text x={(b.xmin + b.xmax) / 2} y={(b.ymin + b.ymax) / 2} dy="0.35em" textAnchor="middle" fontSize={r * 1.8} fill="#fff">
                      ×
                    </text>
                  )}
                </g>
              );
            })}
            {added.map((m, i) => (
              <g key={`a${i}`} className="pop">
                <circle cx={m.x} cy={m.y} r={r} fill="#c2410c" stroke="#fff" strokeWidth={r * 0.15} />
                <text x={m.x} y={m.y} dy="0.35em" textAnchor="middle" fontSize={r * 1.1} fontWeight="700" fill="#fff">
                  {++n}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">Tap a box to take it out. Tap an empty spot to add one we missed.</p>
        <div className="flex items-center gap-2" role="group" aria-label="Fix the count">
          <button type="button" onClick={minus} disabled={count === 0} className="press grid size-11 place-items-center rounded-lg border border-line-strong bg-white hover:bg-sunken disabled:opacity-50" aria-label="One less">
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center text-xl font-bold tabular-nums" aria-live="polite">
            {count}
          </span>
          <button type="button" onClick={plus} className="press grid size-11 place-items-center rounded-lg border border-line-strong bg-white hover:bg-sunken" aria-label="One more">
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function area(d: Detection) {
  return (d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin);
}
