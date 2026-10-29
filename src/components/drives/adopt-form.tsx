"use client";

// Starting a drive for a posted request: how many, and who's helping. The
// server checks availability again on submit; if another group took some in
// the meantime, the form says so and keeps the person's choices.

import { useState } from "react";
import { adoptAction } from "@/actions/app";
import { newIdempotencyKey } from "@/lib/keys";
import { countNoun, formatCount, listPhrase, pluralize } from "@/domain/text";
import { SubmitButton } from "../ui/button";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { Fieldset, TextField } from "../ui/field";
import { AppLink } from "../ui/base";
import { QuantityPicker } from "../ui/quantity-picker";
import { PendingContext, useActionSubmit } from "../ui/use-action-submit";

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
}: {
  requestId: string;
  orgName: string;
  available: number;
  unitName: string;
  requestType: "kit" | "item";
  components: { id: string; name: string; quantityPerUnit: number; details: string }[];
  groups: AdoptGroup[];
  initialQuantity: number | null;
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
      <form onSubmit={onSubmit} className="max-w-xl space-y-8" noValidate>
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="idempotencyKey" value={key} />
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} code={failed.code} /> : null}

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("quantity")} className="font-semibold">
              How many {units}?
            </label>
            <p id="quantity-hint" className="text-sm text-muted">
              {formatCount(available)} still open. You can change this later.
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
          <p id="supply-preview" aria-live="polite" className="rounded-lg bg-sunken px-4 py-3">
            {valid ? (
              <>
                <span className="font-semibold">You&rsquo;ll bring: </span>
                {listPhrase(lines.map((c) => countNoun(c.quantityPerUnit * n, c.name)))}
              </>
            ) : (
              <span className="text-muted">Enter a number to see what you&rsquo;ll bring.</span>
            )}
          </p>
        </div>

        <Fieldset legend="Who's helping?" id={fieldId("groupId")} error={errors.groupId}>
          {groups.length > 0 ? (
            <div className="space-y-2">
              {[...groups, { id: "new", name: "Someone new", existingCommitmentId: null }].map((g) => (
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
                        Already helping with this.{" "}
                        <AppLink href={`/drives/${g.existingCommitmentId}`} className="font-semibold">
                          Change the number there
                        </AppLink>
                        .
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <input type="hidden" name="groupId" value="new" />
          )}
          {groupChoice === "new" ? (
            <TextField
              id={fieldId("group.name")}
              name="groupName"
              label="Name to show"
              hint="Shown publicly, like “The Garcia family” or “Lakeside High Key Club”"
              error={errors["group.name"] ?? errors["group.city"]}
              autoComplete="organization"
              maxLength={120}
            />
          ) : null}
        </Fieldset>

        <div className="space-y-3">
          <SubmitButton pendingLabel="Starting…" disabled={!valid} className="min-h-12 w-full px-6 sm:w-auto">
            {valid ? `Help with ${countNoun(n, unitName).toLowerCase()}` : "Start helping"}
          </SubmitButton>
          <p className="text-sm text-muted">
            {orgName} sees this name and your progress. You get the drop-off details and an invite link for anyone helping you.
          </p>
        </div>
      </form>
    </PendingContext>
  );
}
