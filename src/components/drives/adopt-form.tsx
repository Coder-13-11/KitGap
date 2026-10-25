"use client";

// Confirming a drive: choose the quantity, see the supply list, name the
// group. The server checks availability again when this is submitted; if
// another group took some in the meantime, the form explains and keeps the
// person's choices so they can adjust the number.

import { useState } from "react";
import { adoptAction } from "@/actions/app";
import { newIdempotencyKey } from "@/lib/keys";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { SubmitButton } from "../ui/button";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { Fieldset, TextField } from "../ui/field";
import { AppLink } from "../ui/base";
import { QuantityPicker } from "../ui/quantity-picker";
import { PendingContext, useActionSubmit } from "../ui/use-action-submit";
import { WhatHappensNext } from "./what-happens-next";

export interface AdoptGroup {
  id: string;
  name: string;
  existingCommitmentId: string | null;
}

export function AdoptForm({
  requestId,
  orgName,
  available: initialAvailable,
  unitName,
  requestType,
  components,
  groups,
  initialQuantity,
  neededBy,
}: {
  requestId: string;
  orgName: string;
  available: number;
  unitName: string;
  requestType: "kit" | "item";
  components: { id: string; name: string; quantityPerUnit: number; details: string }[];
  groups: AdoptGroup[];
  initialQuantity: number | null;
  neededBy: string | null;
}) {
  const [key] = useState(newIdempotencyKey);
  const { state, pending, onSubmit } = useActionSubmit(adoptAction);
  const failed = state && !state.ok ? state : null;
  const available = typeof failed?.details?.available === "number" ? (failed.details.available as number) : initialAvailable;

  const selectable = groups.filter((g) => !g.existingCommitmentId);
  const [groupChoice, setGroupChoice] = useState<string>(selectable[0]?.id ?? "new");
  const [quantity, setQuantity] = useState(String(Math.min(initialQuantity ?? Math.min(available, 20), available)));
  const n = /^\d+$/.test(quantity) ? Number(quantity) : 0;
  const valid = n >= 1 && n <= available;
  const units = pluralize(unitName).toLowerCase();
  const errors = failed?.fieldErrors ?? {};
  const lines = requestType === "kit" ? components : components.slice(0, 1);

  if (available === 0) {
    return (
      <div className="space-y-3">
        {failed ? <ErrorSummary message={failed.message} fieldErrors={{}} token={state} /> : null}
        <p>Every {unitName.toLowerCase()} in this request is now promised to a group, so a new drive can't start.</p>
        <AppLink href={`/requests/${requestId}`} className="font-semibold">
          Back to the request
        </AppLink>
      </div>
    );
  }

  return (
    <PendingContext value={pending}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form onSubmit={onSubmit} className="min-w-0 space-y-10" noValidate>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="idempotencyKey" value={key} />
          {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} code={failed.code} /> : null}

          <nav aria-label="Steps to start this drive" className="tag-shape border border-line-strong bg-surface">
            <ol className="grid grid-cols-3 divide-x divide-line">
              {[
                ["#adopt-quantity", "How many"],
                ["#adopt-group", "Your group"],
                ["#adopt-confirm", "Confirm"],
              ].map(([href, label], index) => (
                <li key={href}>
                  <a href={href} className="flex min-h-14 flex-col justify-center px-3 py-2 no-underline hover:bg-sunken sm:px-4">
                    <span className="tabular font-serif text-lg leading-none font-semibold text-forest">{index + 1}</span>
                    <span className="text-sm font-semibold">{label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <section id="adopt-quantity" className="scroll-mt-28 space-y-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">
                <label htmlFor={fieldId("quantity")}>How many {units}</label>
              </h2>
              <p id="quantity-hint" className="max-w-prose text-muted">
                {formatCount(available)} {available === 1 ? unitName.toLowerCase() : units} still open. Pick a number your group can
                finish. You can lower it later.
              </p>
              {errors.quantity ? (
                <p id="quantity-error" className="text-sm font-semibold text-danger">
                  <span className="sr-only">Error: </span>
                  {errors.quantity}
                </p>
              ) : null}
            </div>
            <QuantityPicker
              id={fieldId("quantity")}
              name="quantity"
              value={quantity}
              onChange={setQuantity}
              max={available}
              unitName={unitName}
              invalid={Boolean(errors.quantity || (quantity && !valid))}
              describedBy={`quantity-hint${errors.quantity ? " quantity-error" : ""} supply-preview`}
            />
            {quantity && !valid ? (
              <p className="text-sm font-semibold text-danger">Enter a whole number from 1 to {formatCount(available)}.</p>
            ) : null}

            <section id="supply-preview" aria-live="polite" className="tag-shape border border-line-strong bg-paper px-4 py-4">
              <h3 className="font-semibold">{valid ? `Your supply list for ${countNoun(n, unitName)}` : "Your supply list"}</h3>
              {valid ? (
                <ul className="mt-2 divide-y divide-line">
                  {lines.map((c) => (
                    <li key={c.id} className="flex items-baseline justify-between gap-4 py-2">
                      <span>
                        {c.name}
                        {c.details ? <span className="block text-sm text-muted">{c.details}</span> : null}
                      </span>
                      <span className="tabular text-lg font-semibold">{formatCount(c.quantityPerUnit * n)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted">Enter a quantity to see what your group will collect.</p>
              )}
            </section>
          </section>

          <section id="adopt-group" className="scroll-mt-28">
          <Fieldset
            legend={<span className="font-serif text-2xl font-semibold tracking-tight">Who&apos;s helping?</span>}
            id={fieldId("groupId")}
            error={errors.groupId}
          >
            <div className="space-y-2">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className={`flex min-h-12 items-start gap-3 rounded-lg border px-3 py-3 ${g.existingCommitmentId ? "border-line bg-sunken text-muted" : "border-line-strong bg-surface has-[:checked]:border-forest has-[:checked]:bg-forest-tint"}`}
                >
                  <input
                    type="radio"
                    name="groupId"
                    value={g.id}
                    disabled={Boolean(g.existingCommitmentId)}
                    checked={groupChoice === g.id}
                    onChange={() => setGroupChoice(g.id)}
                    className="mt-1 size-5 accent-forest"
                  />
                  <span>
                    <span className="font-semibold">{g.name}</span>
                    {g.existingCommitmentId ? (
                      <span className="block text-sm">
                        Already running a drive for this request.{" "}
                        <AppLink href={`/drives/${g.existingCommitmentId}`} className="font-semibold">
                          Change its quantity there
                        </AppLink>
                        .
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
              <label className="flex min-h-12 items-start gap-3 rounded-lg border border-line-strong bg-surface px-3 py-3 has-[:checked]:border-forest has-[:checked]:bg-forest-tint">
                <input
                  type="radio"
                  name="groupId"
                  value="new"
                  checked={groupChoice === "new"}
                  onChange={() => setGroupChoice("new")}
                  className="mt-1 size-5 accent-forest"
                />
                <span>
                  <span className="font-semibold">{groups.length ? "Someone new" : "You, your family or your group"}</span>
                  <span className="block text-sm text-muted">Just a name and city. You can invite friends or members after.</span>
                </span>
              </label>
            </div>
            {groupChoice === "new" ? (
              <div className="grid gap-4 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2">
                <TextField
                  id={fieldId("group.name")}
                  name="groupName"
                  label="Name to show"
                  hint="Shown publicly, for example “The Garcia family” or “Lakeside High Key Club”"
                  error={errors["group.name"]}
                  autoComplete="organization"
                  maxLength={120}
                />
                <TextField
                  id={fieldId("group.city")}
                  name="groupCity"
                  label="City or area"
                  hint="For example “Kissimmee, FL”"
                  error={errors["group.city"]}
                  maxLength={120}
                />
              </div>
            ) : null}
          </Fieldset>
          </section>

          <section id="adopt-confirm" className="scroll-mt-28 space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Confirm</h2>
            <SubmitButton pendingLabel="Starting the drive…" disabled={!valid} className="min-h-12 w-full px-6 sm:w-auto">
              Confirm and start helping
            </SubmitButton>
            <p className="max-w-prose text-sm text-muted">
              {orgName} sees the name you choose and your progress. Anyone you invite stays private. You can lower the number or stop
              later, and anything already delivered still counts.
            </p>
          </section>
        </form>

        <WhatHappensNext orgName={orgName} isKit={requestType === "kit"} neededBy={neededBy} share={valid ? countNoun(n, unitName) : null} className="lg:sticky lg:top-20" />
      </div>
    </PendingContext>
  );
}
