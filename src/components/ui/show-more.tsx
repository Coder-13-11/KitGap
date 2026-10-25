import type { ReactNode } from "react";

// Folds the tail of a long list behind one tap. Plain <details>, so it works
// without JavaScript and screen readers announce it as expandable.
export function ShowMore({ count, noun, children }: { count: number; noun: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-forest">
        <span className="group-open:hidden">
          Show {count} {count === 1 ? noun : `${noun}s`}
        </span>
        <span className="hidden group-open:inline">Show fewer</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
