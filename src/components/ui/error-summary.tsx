"use client";

// Shown at the top of a form after a failed save. It takes focus so screen
// reader and keyboard users land on it, and links each problem to its field.

import { useEffect, useRef } from "react";

export function fieldId(name: string): string {
  return `f-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function ErrorSummary({
  message,
  fieldErrors,
  token,
  idFor = fieldId,
  code,
}: {
  message: string;
  fieldErrors: Record<string, string>;
  // Changes on every failed submission so focus moves again.
  token: unknown;
  idFor?: (name: string) => string;
  code?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [token]);
  const entries = Object.entries(fieldErrors);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className="appear rounded-lg border-2 border-danger bg-surface px-4 py-3 outline-none focus-visible:ring-4 focus-visible:ring-focus/40"
    >
      <h2 id="error-summary-title" className="text-lg font-semibold text-danger">
        There is a problem
      </h2>
      <p className="mt-1">{message}</p>
      {code === "sign_in_required" ? (
        <p className="mt-2">
          <a href="/sign-in?next=/welcome" target="_blank" rel="noopener" className="font-semibold">
            Sign in again in a new tab
          </a>
          , then come back to this tab and press the button again. Your entries are still here.
        </p>
      ) : null}
      {entries.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {entries.map(([name, text]) => (
            <li key={name}>
              <a
                href={`#${idFor(name)}`}
                className="font-semibold text-danger underline"
                onClick={(event) => {
                  const target = document.getElementById(idFor(name));
                  if (target) {
                    event.preventDefault();
                    target.scrollIntoView({ block: "center" });
                    target.focus();
                  }
                }}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
