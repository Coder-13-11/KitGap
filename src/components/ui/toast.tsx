"use client";

// A short confirmation shown at the bottom of the screen after a save. It's
// the one live region for success messages, so screen readers hear each
// confirmation once, even when the form that was used has disappeared.

import { CheckCircle2, X } from "lucide-react";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return use(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<number | null>(null);
  const show = useCallback((text: string) => {
    setMessage((prev) => ({ text, id: (prev?.id ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!message) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 7000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [message]);

  return (
    <ToastContext value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 no-print">
        {message ? (
          <div key={message.id} className="appear pointer-events-auto flex max-w-lg items-start gap-3 rounded-lg border border-forest/30 bg-surface px-4 py-3 shadow-lg">
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-forest" />
            <p className="text-[0.95rem]">{message.text}</p>
            <button type="button" onClick={() => setMessage(null)} className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken">
              <X aria-hidden className="size-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext>
  );
}
