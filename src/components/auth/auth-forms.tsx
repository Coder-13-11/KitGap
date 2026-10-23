"use client";

import { useState } from "react";
import {
  requestPasswordResetAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/actions/auth";
import { updateDisplayNameAction } from "@/actions/app";
import { AppLink } from "../ui/base";
import { SubmitButton } from "../ui/button";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { TextField } from "../ui/field";
import { Notice } from "../ui/notice";
import { PendingContext, useActionSubmit } from "../ui/use-action-submit";
import { ActionForm } from "../ui/action-form";

function PasswordField({ id, label, error, autoComplete, hint }: { id: string; label: string; error?: string; autoComplete: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-1.5">
      <TextField id={id} name="password" type={shown ? "text" : "password"} label={label} hint={hint} error={error} autoComplete={autoComplete} maxLength={72} />
      <label className="inline-flex min-h-9 items-center gap-2 text-sm">
        <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} className="size-4 accent-forest" />
        Show password
      </label>
    </div>
  );
}

export function SignInForm({ next, defaultEmail }: { next: string; defaultEmail?: string }) {
  const { state, pending, onSubmit } = useActionSubmit(signInAction);
  const failed = state && !state.ok ? state : null;
  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} /> : null}
        {failed?.code === "email_not_confirmed" ? (
          <p className="text-sm">
            <AppLink href={`/check-email?email=${encodeURIComponent(defaultEmail ?? "")}`} className="font-semibold">
              Send the confirmation email again
            </AppLink>
          </p>
        ) : null}
        <TextField id={fieldId("email")} name="email" type="email" label="Email address" error={failed?.fieldErrors.email} autoComplete="email" defaultValue={defaultEmail} />
        <PasswordField id={fieldId("password")} label="Password" error={failed?.fieldErrors.password} autoComplete="current-password" />
        <SubmitButton pendingLabel="Signing in…" full>
          Sign in
        </SubmitButton>
      </form>
    </PendingContext>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useActionSubmit(signUpAction);
  const failed = state && !state.ok ? state : null;
  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} /> : null}
        <TextField
          id={fieldId("name")}
          name="name"
          label="Your name"
          hint="Shown to members of the groups and organizations you join, never on public pages."
          error={failed?.fieldErrors.name}
          autoComplete="name"
          maxLength={80}
        />
        <TextField id={fieldId("email")} name="email" type="email" label="Email address" hint="We'll send a link to confirm it. It's never shown to anyone." error={failed?.fieldErrors.email} autoComplete="email" />
        <PasswordField id={fieldId("password")} label="Create a password" hint="At least 8 characters." error={failed?.fieldErrors.password} autoComplete="new-password" />
        <SubmitButton pendingLabel="Creating account…" full>
          Create account
        </SubmitButton>
      </form>
    </PendingContext>
  );
}

export function ResendConfirmationForm({ email }: { email: string }) {
  return (
    <ActionForm action={resendConfirmationAction} resetOnSuccess={false} success="If that address has an unconfirmed account, we sent a new link.">
      {(errors, f) => (
        <>
          <TextField id={f("email")} name="email" type="email" label="Email address" defaultValue={email} error={errors.email} autoComplete="email" />
          <SubmitButton variant="secondary" pendingLabel="Sending…">
            Send the link again
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useActionSubmit(requestPasswordResetAction);
  const failed = state && !state.ok ? state : null;
  if (state?.ok) {
    return (
      <Notice tone="success" live="polite" title="Check your email">
        If there's an account for that address, we sent a link to choose a new password. It works once and expires after an hour.
      </Notice>
    );
  }
  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} /> : null}
        <TextField id={fieldId("email")} name="email" type="email" label="Email address" error={failed?.fieldErrors.email} autoComplete="email" />
        <SubmitButton pendingLabel="Sending…" full>
          Send reset link
        </SubmitButton>
      </form>
    </PendingContext>
  );
}

export function NewPasswordForm() {
  const { state, pending, onSubmit } = useActionSubmit(updatePasswordAction);
  const failed = state && !state.ok ? state : null;
  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} /> : null}
        {failed?.code === "sign_in_required" ? (
          <p>
            <AppLink href="/forgot-password" className="font-semibold">
              Request a new reset link
            </AppLink>
          </p>
        ) : null}
        <PasswordField id={fieldId("password")} label="New password" hint="At least 8 characters." error={failed?.fieldErrors.password} autoComplete="new-password" />
        <SubmitButton pendingLabel="Saving…" full>
          Save new password
        </SubmitButton>
      </form>
    </PendingContext>
  );
}

export function DisplayNameForm({ displayName }: { displayName: string }) {
  return (
    <ActionForm action={updateDisplayNameAction} resetOnSuccess={false} success="Saved.">
      {(errors, f) => (
        <>
          <TextField id={f("displayName")} name="displayName" label="Your name" hint="Shown to members of your groups and organizations." defaultValue={displayName} error={errors.displayName} maxLength={80} autoComplete="name" />
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Save name
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
