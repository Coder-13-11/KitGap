"use client";

// The organization's request form, in four short steps with a review step.
// "Continue" checks the current step and saves a draft; "Submit for review"
// runs the full check on the server. If the session has expired, the answers
// are kept in this browser tab and restored after signing in again.

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { saveRequestDraftAction, submitRequestAction } from "@/actions/app";
import { US_TIMEZONES, todayIn } from "@/domain/dates";
import { CATEGORY_LABEL } from "@/domain/phase";
import {
  CATEGORIES,
  REQUEST_STEPS,
  stepForField,
  validateRequestInput,
  type RequestFieldErrors,
  type RequestInput,
} from "@/domain/request-input";
import { countNoun, formatCount, listPhrase, pluralize } from "@/domain/text";
import type { ActionResult } from "@/lib/action-result";
import { newIdempotencyKey } from "@/lib/keys";
import { AppLink } from "../ui/base";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { Fieldset, SelectField, TextArea, TextField, inputClass } from "../ui/field";
import { Notice } from "../ui/notice";

type SaveResult = ActionResult<{ requestId: string; savedAt: string }>;

const noSubscription = () => () => {};

function readKept(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearKept(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

export function RequestForm({
  orgId,
  orgName,
  requestId: initialRequestId,
  initial,
  reviewNote,
  signInHref,
}: {
  orgId: string;
  orgName: string;
  requestId: string | null;
  initial: RequestInput;
  reviewNote: string | null;
  signInHref: string;
}) {
  const storageKey = `kitgap:request:${orgId}:${initialRequestId ?? "new"}`;
  const [values, setValues] = useState<RequestInput>(initial);
  const [step, setStep] = useState(0);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [createKey] = useState(newIdempotencyKey);
  const [stepErrors, setStepErrors] = useState<{ errors: RequestFieldErrors; message: string; token: number } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<ActionResult | null>(null);
  const [pendingKind, setPendingKind] = useState<"advance" | "draft" | "submit" | null>(null);
  const [busy, startSaving] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Answers kept in this tab after a session expired, offered back to the person.
  const kept = useSyncExternalStore(
    noSubscription,
    () => readKept(storageKey),
    () => null,
  );
  const [keptHandled, setKeptHandled] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const update = <K extends keyof RequestInput>(key: K, value: RequestInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const errors = stepErrors?.errors ?? {};
  const fullCheck = useMemo(() => validateRequestInput(values, "submit"), [values]);

  function showErrors(fieldErrors: RequestFieldErrors, message: string) {
    setStepErrors((prev) => ({ errors: fieldErrors, message, token: (prev?.token ?? 0) + 1 }));
  }

  function handleFailure(result: ActionResult) {
    if (result.ok) return;
    setLastFailure(result);
    if (result.code === "sign_in_required") {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // If storage is blocked the answers stay on screen until the tab closes.
      }
    }
    const first = Object.keys(result.fieldErrors)[0];
    if (first) setStep(stepForField(first));
    showErrors(result.fieldErrors, result.message);
  }

  function formDataFor(): FormData {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(values));
    fd.set("orgId", orgId);
    fd.set("requestId", requestId ?? "");
    fd.set("idempotencyKey", createKey);
    return fd;
  }

  function errorsForStep(index: number): RequestFieldErrors {
    return Object.fromEntries(Object.entries(fullCheck.errors).filter(([field]) => stepForField(field) === index));
  }

  function save(nextStep: number | null) {
    const fd = formDataFor();
    setPendingKind(nextStep === null ? "draft" : "advance");
    setStepErrors(null);
    setLastFailure(null);
    startSaving(async () => {
      const result = (await saveRequestDraftAction(null, fd)) as SaveResult;
      if (result.ok) {
        setRequestId(result.data.requestId);
        setSavedAt(result.data.savedAt);
        if (nextStep !== null) setStep(nextStep);
      } else {
        handleFailure(result);
      }
      setPendingKind(null);
    });
  }

  function goTo(next: number) {
    if (busy) return;
    if (next > step) {
      const problems = errorsForStep(step);
      if (Object.keys(problems).length > 0) {
        showErrors(problems, "Check these answers before continuing.");
        return;
      }
    }
    save(next);
  }

  function saveDraftOnly() {
    if (busy) return;
    save(null);
  }

  function submitForReview() {
    if (busy) return;
    const firstBad = Object.keys(fullCheck.errors)[0];
    if (firstBad) {
      setStep(stepForField(firstBad));
      showErrors(fullCheck.errors, "Some answers need attention before you can submit.");
      return;
    }
    const fd = formDataFor();
    setPendingKind("submit");
    setStepErrors(null);
    setLastFailure(null);
    startSaving(async () => {
      // On success the server redirects to the request's page.
      const result = await submitRequestAction(null, fd);
      if (result && !result.ok) handleFailure(result);
      setPendingKind(null);
    });
  }

  const expired = lastFailure !== null && !lastFailure.ok && lastFailure.code === "sign_in_required";
  const saving = busy && (pendingKind === "advance" || pendingKind === "draft");
  const submitting = busy && pendingKind === "submit";
  const isKit = values.requestType !== "item";
  const target = fullCheck.value.targetQuantity;

  return (
    <div className="space-y-6">
      {reviewNote ? (
        <Notice tone="warning" title="A KitGap reviewer asked for changes">
          “{reviewNote}”
        </Notice>
      ) : null}
      {kept && !keptHandled ? (
        <Notice tone="info" title="You have unsaved answers from earlier">
          <p>Your session expired before they were saved. Restore them into this form?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                try {
                  setValues(JSON.parse(kept) as RequestInput);
                  setRestored(true);
                } catch {
                  // Unreadable copy: ignore it.
                }
                clearKept(storageKey);
                setKeptHandled(true);
              }}
            >
              Restore answers
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearKept(storageKey);
                setKeptHandled(true);
              }}
            >
              Discard them
            </Button>
          </div>
        </Notice>
      ) : null}
      {restored ? (
        <Notice tone="success" live="polite">
          Your earlier answers are back in the form. Save to keep them.
        </Notice>
      ) : null}

      <nav aria-label="Form steps">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REQUEST_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => {
                  if (i < step) {
                    setStepErrors(null);
                    setStep(i);
                  } else if (i > step) goTo(i);
                }}
                aria-current={i === step ? "step" : undefined}
                disabled={busy}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold",
                  i === step ? "border-forest bg-forest-tint text-forest-dark" : i < step ? "border-line bg-surface text-ink" : "border-line bg-surface text-muted",
                )}
              >
                <span className={cn("tabular flex size-6 shrink-0 items-center justify-center rounded-full text-xs", i === step ? "bg-forest text-white" : "bg-sunken")}>
                  {i + 1}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {expired ? (
        <Notice tone="warning" title="Your session expired">
          Your answers are kept in this tab.{" "}
          <AppLink href={signInHref} className="font-semibold">
            Sign in again
          </AppLink>{" "}
          and you'll come back here with them restored.
        </Notice>
      ) : null}
      {stepErrors ? <ErrorSummary message={stepErrors.message} fieldErrors={stepErrors.errors} token={stepErrors.token} /> : null}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) goTo(step + 1);
          else submitForReview();
        }}
        className="space-y-6 rounded-lg border border-line bg-surface p-5 sm:p-6"
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Step {step + 1} of 4: {REQUEST_STEPS[step].title}
        </h2>

        {step === 0 ? (
          <>
            <TextField
              id={fieldId("title")}
              label="Request title"
              hint="Say what and for whom, for example “School-supply kits for students starting mid-year”"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              error={errors.title}
              maxLength={140}
            />
            <TextArea
              id={fieldId("need")}
              label="What's the need?"
              hint="Explain the situation concretely: why these items, and what difference they make."
              value={values.need}
              onChange={(e) => update("need", e.target.value)}
              error={errors.need}
              rows={5}
              maxLength={2000}
            />
            <TextField
              id={fieldId("beneficiaries")}
              label="Who will this help?"
              hint="Describe the group in general terms, like “students in our after-school program”. Never name or identify individual children."
              value={values.beneficiaries}
              onChange={(e) => update("beneficiaries", e.target.value)}
              error={errors.beneficiaries}
              maxLength={500}
            />
            <SelectField
              id={fieldId("category")}
              label="Category"
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              error={errors.category}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Fieldset legend="What are you asking for?" id={fieldId("requestType")} error={errors.requestType}>
              {[
                { value: "kit", title: "Complete kits", text: "Every kit contains the same set of items, like a backpack, two notebooks and a pencil pack." },
                { value: "item", title: "A single item", text: "One kind of item, like 100 composition notebooks." },
              ].map((option) => (
                <label key={option.value} className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong px-3 py-3">
                  <input
                    type="radio"
                    name="requestType"
                    checked={values.requestType === option.value}
                    onChange={() =>
                      setValues((v) => ({
                        ...v,
                        requestType: option.value,
                        unitName: option.value === "kit" ? (v.requestType === "kit" ? v.unitName : "kit") : v.requestType === "item" ? v.unitName : "",
                      }))
                    }
                    className="mt-1 size-5 accent-forest"
                  />
                  <span>
                    <span className="font-semibold">{option.title}</span>
                    <span className="block text-sm text-muted">{option.text}</span>
                  </span>
                </label>
              ))}
            </Fieldset>

            {isKit ? (
              <TextField
                id={fieldId("unitName")}
                label="What do you call one kit?"
                hint="Usually just “kit”. You could say “hygiene kit” or “winter kit”."
                value={values.unitName}
                onChange={(e) => update("unitName", e.target.value)}
                error={errors.unitName}
                maxLength={60}
                className="max-w-md"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={fieldId("unitName")}
                  label="Item"
                  hint="Name one item exactly, like “Composition notebook” or “Pack of 10 pencils”."
                  value={values.unitName}
                  onChange={(e) => update("unitName", e.target.value)}
                  error={errors.unitName}
                  maxLength={60}
                />
                <TextField
                  id={fieldId("components.0.details")}
                  label="Description"
                  optional
                  hint="Size, type or brand details that matter"
                  value={values.components[0]?.details ?? ""}
                  onChange={(e) => update("components", [{ name: values.unitName, quantityPerUnit: "1", details: e.target.value }])}
                  error={errors["components.0.details"]}
                  maxLength={300}
                />
              </div>
            )}

            <TextField
              id={fieldId("targetQuantity")}
              label={isKit ? `How many ${pluralize(values.unitName || "kit").toLowerCase()} do you need?` : "How many do you need?"}
              hint="A whole number. Groups can each adopt part of it."
              value={String(values.targetQuantity ?? "")}
              onChange={(e) => update("targetQuantity", e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              error={errors.targetQuantity}
              inputMode="numeric"
              pattern="[0-9]*"
              className="max-w-xs"
            />

            {isKit ? (
              <ComponentEditor
                rows={values.components}
                onChange={(rows) => update("components", rows)}
                errors={errors}
                unitName={values.unitName || "kit"}
              />
            ) : null}

            {target && fullCheck.value.components.length > 0 ? (
              <div aria-live="polite" className="rounded-md bg-forest-tint px-4 py-3">
                <p className="font-semibold">
                  {countNoun(target, values.unitName || "kit")} {isKit ? "require" : "means"}{" "}
                  {listPhrase(fullCheck.value.components.map((c) => countNoun(c.quantityPerUnit * target, c.name)))} in total.
                </p>
              </div>
            ) : null}

            <TextArea
              id={fieldId("conditionNotes")}
              label="Accepted condition"
              optional
              hint="For example, “New items only” or “Gently used coats are welcome”"
              value={values.conditionNotes}
              onChange={(e) => update("conditionNotes", e.target.value)}
              error={errors.conditionNotes}
              rows={2}
              maxLength={1000}
            />
            <TextArea
              id={fieldId("substitutions")}
              label="Accepted substitutions"
              optional
              hint="What groups may swap, for example “College-ruled notebooks are fine”. Anything not listed should be brought as described."
              value={values.substitutions}
              onChange={(e) => update("substitutions", e.target.value)}
              error={errors.substitutions}
              rows={2}
              maxLength={1000}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={fieldId("neededBy")}
                type="date"
                label="Needed by"
                hint="New drives can start until the end of this day."
                value={values.neededBy}
                min={todayIn(values.timezone || "America/New_York")}
                onChange={(e) => update("neededBy", e.target.value)}
                error={errors.neededBy}
              />
              <SelectField
                id={fieldId("timezone")}
                label="Your timezone"
                hint="Dates are counted in this timezone."
                value={values.timezone}
                onChange={(e) => update("timezone", e.target.value)}
                error={errors.timezone}
                options={US_TIMEZONES}
              />
            </div>
            <TextField
              id={fieldId("location")}
              label="General location"
              hint="City or area shown publicly, like “Kissimmee, FL”. Put your street address in the handover instructions instead."
              value={values.location}
              onChange={(e) => update("location", e.target.value)}
              error={errors.location}
              maxLength={120}
              className="max-w-md"
            />
            <TextArea
              id={fieldId("handoverInstructions")}
              label="Handover instructions"
              optional
              hint="Where and when groups drop items off. Only groups running a drive can see this."
              value={values.handoverInstructions}
              onChange={(e) => update("handoverInstructions", e.target.value)}
              error={errors.handoverInstructions}
              rows={3}
              maxLength={2000}
            />
            <TextField
              id={fieldId("coordinatorContact")}
              label="Contact for groups"
              optional
              hint="Name and phone or email for drop-off questions. Only groups running a drive can see this."
              value={values.coordinatorContact}
              onChange={(e) => update("coordinatorContact", e.target.value)}
              error={errors.coordinatorContact}
              maxLength={300}
            />
            <TextField
              id={fieldId("fundraisingUrl")}
              type="url"
              label="Link to your own fundraising page"
              optional
              hint="If you also accept money elsewhere. It's shown as an external link; KitGap doesn't process or track money, and it never counts as kits."
              value={values.fundraisingUrl}
              onChange={(e) => update("fundraisingUrl", e.target.value)}
              error={errors.fundraisingUrl}
              placeholder="https://"
              maxLength={500}
            />
          </>
        ) : null}

        {step === 3 ? <ReviewStep values={values} orgName={orgName} onEdit={(i) => (setStepErrors(null), setStep(i))} /> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => (setStepErrors(null), setStep(step - 1))} disabled={busy}>
                Back
              </Button>
            ) : null}
            <Button variant="quiet" onClick={saveDraftOnly} pending={busy && pendingKind === "draft"} pendingLabel="Saving…" disabled={busy || values.title.trim().length < 5}>
              Save draft
            </Button>
            <p role="status" className="text-sm text-muted">
              {saving ? "Saving…" : savedAt ? `Draft saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
            </p>
          </div>
          {step < 3 ? (
            <Button type="submit" pending={busy && pendingKind === "advance"} pendingLabel="Saving…">
              Save and continue
            </Button>
          ) : (
            <Button type="submit" pending={submitting} pendingLabel="Submitting…">
              Submit for review
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function ComponentEditor({
  rows,
  onChange,
  errors,
  unitName,
}: {
  rows: RequestInput["components"];
  onChange: (rows: RequestInput["components"]) => void;
  errors: RequestFieldErrors;
  unitName: string;
}) {
  const setRow = (index: number, patch: Partial<RequestInput["components"][number]>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Fieldset
      legend={`What goes in each ${unitName.toLowerCase()}?`}
      hint="One line per item. If an item comes as a pack, name the pack (“Pencil pack, 10 pencils”) rather than the single pencil."
      id={fieldId("components")}
      error={errors.components}
    >
      <ol className="space-y-3">
        {rows.map((row, index) => (
          <li key={index} className="rounded-md border border-line bg-paper p-3">
            <div className="grid gap-3 sm:grid-cols-[2fr_8rem_auto] sm:items-start">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId(`components.${index}.name`)} className="text-sm font-semibold">
                  Item {index + 1}
                </label>
                {errors[`components.${index}.name`] ? (
                  <p className="text-sm font-semibold text-danger">
                    <span className="sr-only">Error: </span>
                    {errors[`components.${index}.name`]}
                  </p>
                ) : null}
                <input
                  id={fieldId(`components.${index}.name`)}
                  value={row.name}
                  onChange={(e) => setRow(index, { name: e.target.value })}
                  aria-invalid={errors[`components.${index}.name`] ? true : undefined}
                  className={inputClass(errors[`components.${index}.name`])}
                  maxLength={80}
                  placeholder="For example, Backpack"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId(`components.${index}.quantityPerUnit`)} className="text-sm font-semibold">
                  Per {unitName.toLowerCase()}
                </label>
                {errors[`components.${index}.quantityPerUnit`] ? (
                  <p className="text-sm font-semibold text-danger">
                    <span className="sr-only">Error: </span>
                    {errors[`components.${index}.quantityPerUnit`]}
                  </p>
                ) : null}
                <input
                  id={fieldId(`components.${index}.quantityPerUnit`)}
                  value={String(row.quantityPerUnit ?? "")}
                  onChange={(e) => setRow(index, { quantityPerUnit: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-invalid={errors[`components.${index}.quantityPerUnit`] ? true : undefined}
                  className={inputClass(errors[`components.${index}.quantityPerUnit`], "tabular")}
                />
              </div>
              <div className="sm:pt-7">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : [{ name: "", quantityPerUnit: "1", details: "" }])}
                  aria-label={`Remove item ${index + 1}${row.name ? ` (${row.name})` : ""}`}
                >
                  <Trash2 aria-hidden className="size-4" /> Remove
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor={fieldId(`components.${index}.details`)} className="text-sm font-semibold">
                Details <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id={fieldId(`components.${index}.details`)}
                value={row.details}
                onChange={(e) => setRow(index, { details: e.target.value })}
                className={inputClass(errors[`components.${index}.details`])}
                maxLength={300}
                placeholder="For example, wide-ruled, 70 sheets"
              />
            </div>
          </li>
        ))}
      </ol>
      {rows.length < 20 ? (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange([...rows, { name: "", quantityPerUnit: "1", details: "" }])}>
            <Plus aria-hidden className="size-4" /> Add an item
          </Button>
        </div>
      ) : null}
    </Fieldset>
  );
}

function ReviewStep({ values, orgName, onEdit }: { values: RequestInput; orgName: string; onEdit: (step: number) => void }) {
  const { value } = validateRequestInput(values, "draft");
  const target = value.targetQuantity ?? 0;
  const rows: { step: number; label: string; content: React.ReactNode }[] = [
    { step: 0, label: "Title", content: value.title },
    { step: 0, label: "The need", content: <span className="whitespace-pre-line">{value.need}</span> },
    { step: 0, label: "Who it helps", content: value.beneficiaries },
    { step: 0, label: "Category", content: CATEGORY_LABEL[value.category] },
    {
      step: 1,
      label: "Requested",
      content: value.requestType === "kit" ? `${countNoun(target, value.unitName)}, each containing:` : `${countNoun(target, value.unitName)}`,
    },
    {
      step: 1,
      label: "Total supplies",
      content: (
        <ul className="space-y-0.5">
          {value.components.map((c) => (
            <li key={c.normalizedKey} className="tabular">
              {value.requestType === "kit" ? `${formatCount(c.quantityPerUnit)} per kit → ` : ""}
              <strong>{countNoun(c.quantityPerUnit * target, c.name)}</strong>
              {c.details ? <span className="text-muted"> ({c.details})</span> : null}
            </li>
          ))}
        </ul>
      ),
    },
    { step: 1, label: "Accepted condition", content: value.conditionNotes || "Not specified" },
    { step: 1, label: "Substitutions", content: value.substitutions || "None" },
    { step: 2, label: "Needed by", content: value.neededBy ? `${value.neededBy} (${US_TIMEZONES.find((t) => t.value === value.timezone)?.label ?? value.timezone})` : "Not set" },
    { step: 2, label: "Location", content: value.location || "Not set" },
    { step: 2, label: "Handover instructions (private)", content: value.handoverInstructions || "Not provided" },
    { step: 2, label: "Contact for groups (private)", content: value.coordinatorContact || "Not provided" },
    { step: 2, label: "External fundraising link", content: value.fundraisingUrl || "None" },
  ];
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr_auto] sm:gap-4">
            <dt className="font-semibold">{row.label}</dt>
            <dd className="min-w-0 break-words">{row.content}</dd>
            <dd>
              <button type="button" onClick={() => onEdit(row.step)} className="text-sm font-semibold text-forest underline underline-offset-2">
                Change<span className="sr-only"> {row.label.toLowerCase()}</span>
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 rounded-md bg-sunken p-4 text-[0.95rem]">
        <p className="font-semibold">What happens when you submit</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A KitGap reviewer checks the request and, if needed, confirms {orgName}'s contact. It's listed publicly once approved.</li>
          <li>Once a group starts a drive, the quantity and the items can't change, because groups have promised them. You can still edit descriptions and handover details, or copy the request into a new one.</li>
        </ul>
      </div>
    </div>
  );
}
