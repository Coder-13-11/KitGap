"use client";

import { Building2, Mail, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  requestPasswordResetAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/actions/auth";
import { updateDisplayNameAction } from "@/actions/app";
import { AppLink } from "../ui/base";
import { Button, SubmitButton } from "../ui/button";
import { cn } from "../ui/cn";
import { Steps } from "../ui/steps";
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

export type SignUpIntent = "organization" | "group" | "invited";

const INTENTS: { id: SignUpIntent; title: string; short: string; text: string; icon: ReactNode }[] = [
  { id: "group", title: "A school club or group", short: "a club or group", text: "Run a drive: pick a request, invite members, collect and deliver.", icon: <Users /> },
  { id: "organization", title: "An organization", short: "an organization", text: "Post what the people you serve need, then confirm what arrives.", icon: <Building2 /> },
  { id: "invited", title: "I was invited", short: "someone who was invited", text: "Someone sent you a link to join their group and pledge supplies.", icon: <Mail /> },
];

export function SignUpFlow({ next, initialIntent }: { next: string; initialIntent?: SignUpIntent }) {
  const [intent, setIntent] = useState<SignUpIntent | null>(initialIntent ?? null);
  const [step, setStep] = useState<1 | 2>(initialIntent ? 2 : 1);
  const chosen = INTENTS.find((i) => i.id === intent);
  return (
    <div className="space-y-6">
      <Steps labels={["Who you are", "Your account", intent === "invited" ? "Join" : "Set up"]} current={step} />
      {step === 1 ? (
        <fieldset className="space-y-3">
          <legend className="mb-3 text-lg font-semibold">What brings you here?</legend>
          {INTENTS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "press flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest",
                intent === option.id ? "border-forest bg-forest-tint" : "border-line-strong hover:border-forest/50",
              )}
            >
              <input type="radio" name="intent" value={option.id} checked={intent === option.id} onChange={() => setIntent(option.id)} className="sr-only" />
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-forest text-white [&_svg]:size-5">
                {option.icon}
              </span>
              <span>
                <span className="block font-semibold">{option.title}</span>
                <span className="block text-sm text-muted">{option.text}</span>
              </span>
            </label>
          ))}
          <Button type="button" full disabled={!intent} onClick={() => setStep(2)}>
            Continue
          </Button>
        </fieldset>
      ) : (
        <div className="space-y-4">
          {chosen ? (
            <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sunken px-3 py-2 text-sm">
              <span>
                Signing up as: <span className="font-semibold">{chosen.short}</span>
              </span>
              <button type="button" onClick={() => setStep(1)} className="font-semibold text-forest underline">
                Change
              </button>
            </p>
          ) : null}
          <SignUpForm next={next} intent={intent ?? "invited"} />
        </div>
      )}
    </div>
  );
}

export function SignUpForm({ next, intent }: { next: string; intent?: SignUpIntent }) {
  const { state, pending, onSubmit } = useActionSubmit(signUpAction);
  const failed = state && !state.ok ? state : null;
  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {intent ? <input type="hidden" name="intent" value={intent} /> : null}
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
