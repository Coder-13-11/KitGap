"use client";

// Submits a form to a server action without React's automatic form reset,
// so a failed save keeps everything the person typed.

import { createContext, startTransition, useActionState, useContext, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";

type Action<T> = (prev: unknown, formData: FormData) => Promise<ActionResult<T>>;

// onResult runs as soon as the server answers, even if the form that sent the
// request is about to disappear from the page.
export function useActionSubmit<T>(action: Action<T>, onResult?: (result: ActionResult<T>) => void) {
  const [state, dispatch, pending] = useActionState<ActionResult<T> | null, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    // In the same transition as the result, so both appear in one update.
    startTransition(() => onResult?.(result));
    return result;
  }, null);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }
  return { state, pending, onSubmit };
}

export const PendingContext = createContext<boolean | null>(null);

export function usePendingContext(): boolean | null {
  return useContext(PendingContext);
}
