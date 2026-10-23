"use client";

// A form wired to a server action, with the behaviour every KitGap form
// shares: one idempotency key per submission (so a retry can't act twice),
// the submit button disabled while saving, errors next to fields plus a
// focused summary, entries kept on error, and a short success message.

import { useId, useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { newIdempotencyKey } from "@/lib/keys";
import { cn } from "./cn";
import { ErrorSummary, fieldId } from "./error-summary";
import { Notice } from "./notice";
import { useToast } from "./toast";
import { PendingContext, useActionSubmit } from "./use-action-submit";

type Action = (prev: unknown, formData: FormData) => Promise<ActionResult<unknown>>;

export function ActionForm({
  action,
  hidden = {},
  children,
  success,
  className,
  resetOnSuccess = true,
  onSuccess,
  id,
  "aria-label": ariaLabel,
}: {
  action: Action;
  hidden?: Record<string, string>;
  // Receives the field errors and a function giving each field a unique id.
  children: (errors: Record<string, string>, idFor: (name: string) => string) => ReactNode;
  success?: string | ((data: unknown) => string);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (data: unknown) => void;
  id?: string;
  "aria-label"?: string;
}) {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [formKey, setFormKey] = useState(0);
  const toast = useToast();
  const { state, pending, onSubmit } = useActionSubmit<unknown>(action, (result) => {
    if (!result.ok) return;
    if (success) toast(typeof success === "function" ? success(result.data) : success);
    onSuccess?.(result.data);
  });
  // Reset after each success: new idempotency key, and (optionally) empty fields.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) {
      setIdempotencyKey(newIdempotencyKey());
      if (resetOnSuccess) setFormKey((k) => k + 1);
    }
  }
  const autoId = useId();
  const prefix = id ?? autoId.replace(/[^a-zA-Z0-9_-]/g, "");
  const idFor = (name: string) => fieldId(`${prefix}-${name}`);


  const errors = state && !state.ok ? state.fieldErrors : {};
  const successText = state && state.ok && success ? (typeof success === "function" ? success(state.data) : success) : null;

  return (
    <div className={cn("space-y-3", className)}>
      {state && !state.ok ? <ErrorSummary message={state.message} fieldErrors={state.fieldErrors} token={state} idFor={idFor} /> : null}
      {successText ? (
        // Announced once by the page's status toast; this copy stays beside the form.
        <Notice tone="success">{successText}</Notice>
      ) : null}
      <PendingContext value={pending}>
        <form key={formKey} id={id} onSubmit={onSubmit} noValidate aria-label={ariaLabel}>
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {/* Fields are locked while saving, so nothing typed now is lost when the form resets. */}
          <fieldset disabled={pending} className="m-0 min-w-0 space-y-4 border-0 p-0">
            {children(errors, idFor)}
          </fieldset>
        </form>
      </PendingContext>
    </div>
  );
}
