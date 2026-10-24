import { Check } from "lucide-react";
import { cn } from "./cn";

/** "Step 2 of 3" as a row of labelled dots. The current step is announced as the current step. */
export function Steps({ labels, current, className }: { labels: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2 text-sm", className)} aria-label={`Step ${current} of ${labels.length}`}>
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                state === "done" ? "bg-forest text-white" : state === "current" ? "bg-ink text-white" : "bg-sunken text-muted ring-1 ring-line",
              )}
            >
              {state === "done" ? <Check className="size-3.5" /> : n}
            </span>
            <span className={cn("truncate", state === "current" ? "font-semibold text-ink" : "text-muted", state === "todo" && "hidden sm:inline")}>
              {label}
              {state === "done" ? <span className="sr-only"> (done)</span> : null}
            </span>
            {n < labels.length ? <span aria-hidden className="h-px w-4 shrink-0 bg-line-strong sm:w-8" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
