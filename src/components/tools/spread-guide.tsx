import { Lightbulb } from "lucide-react";

// Shown when a photo looks crowded or the count is unsure. Pictures first,
// a few short words after, so anyone can follow it.
export function SpreadGuide({ tip, compact = false }: { tip?: string; compact?: boolean }) {
  return (
    <section aria-labelledby="spread-title" className="rounded-2xl border border-[#f0d9a8] bg-[#fff8e8] p-5">
      <h3 id="spread-title" className="flex items-center gap-2 text-lg font-semibold text-[#6b4a00]">
        <Lightbulb className="size-5" aria-hidden="true" />
        Spread them out for a better count
      </h3>
      {!compact ? (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden="true">
          <Pile />
          <span className="text-2xl text-[#6b4a00]">→</span>
          <Spread />
        </div>
      ) : null}
      <ol className="mt-4 grid gap-2 text-[#4d3600] sm:grid-cols-2">
        <li className="flex gap-2">
          <Step n={1} />
          One layer. Nothing on top of anything.
        </li>
        <li className="flex gap-2">
          <Step n={2} />A little space between each one.
        </li>
        <li className="flex gap-2">
          <Step n={3} />
          Fit them all in the photo, from above.
        </li>
        <li className="flex gap-2">
          <Step n={4} />
          Good light, plain floor or table.
        </li>
      </ol>
      {tip ? <p className="mt-3 font-semibold text-[#4d3600]">{tip}</p> : null}
    </section>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#6b4a00] text-sm font-bold text-white">{n}</span>;
}

function Pile() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full">
      <rect x="0" y="0" width="120" height="80" rx="10" fill="#fff" stroke="#f0d9a8" />
      {[
        [30, 30, -20],
        [42, 34, 15],
        [52, 28, -5],
        [40, 44, 30],
        [60, 40, -25],
        [50, 50, 10],
      ].map(([x, y, r], i) => (
        <rect key={i} x={x} y={y} width="26" height="16" rx="4" fill="#5f8b75" stroke="#fff" strokeWidth="2" transform={`rotate(${r} ${x + 13} ${y + 8})`} />
      ))}
    </svg>
  );
}

function Spread() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full">
      <rect x="0" y="0" width="120" height="80" rx="10" fill="#fff" stroke="#f0d9a8" />
      {[0, 1, 2].flatMap((c) =>
        [0, 1].map((r) => <rect key={`${c}${r}`} x={12 + c * 36} y={14 + r * 30} width="26" height="16" rx="4" fill="#234d3b" />),
      )}
    </svg>
  );
}
