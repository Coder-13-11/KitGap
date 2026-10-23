"use client";

// A modal built on the native <dialog> element: the browser traps focus,
// Escape closes it, and focus returns to the button that opened it.

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      onClose();
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 id="dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="-mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-sunken"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
