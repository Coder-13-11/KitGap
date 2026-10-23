"use client";

// Submits a form to a server action without React's automatic form reset,
// so a failed save keeps everything the person typed.

import { createContext, startTransition, useActionState, useContext, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";

type Action<T> = (prev: unknown, formData: FormData) => Promise<ActionResult<T>>;

export function useActionSubmit<T>(action: Action<T>) {
  const [state, dispatch, pending] = useActionState<ActionResult<T> | null, FormData>((prev, fd) => action(prev, fd), null);
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
