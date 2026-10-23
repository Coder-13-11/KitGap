"use client";

// Confirming a drive: choose the group, the quantity, and review the supply
// list. The server checks availability again when this is submitted; if
// another group took some in the meantime, the form explains and keeps the
// person's choices so they can adjust the number.

import { useState } from "react";
import { adoptAction } from "@/actions/app";
import { newIdempotencyKey } from "@/lib/keys";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { SubmitButton } from "../ui/button";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { Fieldset, TextField, inputClass } from "../ui/field";
import { AppLink } from "../ui/base";
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
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} code={failed.code} /> : null}

      <Fieldset legend="Which group is running this drive?" id={fieldId("groupId")} error={errors.groupId}>
        <div className="space-y-2">
          {groups.map((g) => (
            <label
              key={g.id}
              className={`flex min-h-12 items-start gap-3 rounded-md border px-3 py-3 ${g.existingCommitmentId ? "border-line bg-sunken text-muted" : "border-line-strong bg-surface"}`}
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
          <label className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong bg-surface px-3 py-3">
            <input
              type="radio"
              name="groupId"
              value="new"
              checked={groupChoice === "new"}
              onChange={() => setGroupChoice("new")}
              className="mt-1 size-5 accent-forest"
            />
            <span>
              <span className="font-semibold">{groups.length ? "A new group" : "Create your group"}</span>
              <span className="block text-sm text-muted">Just a name and city for now. You'll coordinate it, and can invite members after.</span>
            </span>
          </label>
        </div>
        {groupChoice === "new" ? (
          <div className="grid gap-4 rounded-md border border-line bg-paper p-4 sm:grid-cols-2">
            <TextField
              id={fieldId("group.name")}
              name="groupName"
              label="Group name"
              hint="Shown publicly, for example “Lakeside High Key Club”"
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

      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId("quantity")} className="font-semibold">
            How many {units} will your group provide?
          </label>
          <p id="quantity-hint" className="text-sm text-muted">
            {formatCount(available)} {available === 1 ? unitName.toLowerCase() : units} still available. Choose a number your group
            can realistically collect before the needed-by date.
          </p>
          {errors.quantity ? (
            <p id="quantity-error" className="text-sm font-semibold text-danger">
              <span className="sr-only">Error: </span>
              {errors.quantity}
            </p>
          ) : null}
          <input
            id={fieldId("quantity")}
            name="quantity"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            aria-describedby={`quantity-hint${errors.quantity ? " quantity-error" : ""} supply-preview`}
            aria-invalid={errors.quantity || (quantity && !valid) ? true : undefined}
            className={inputClass(errors.quantity || (quantity && !valid) ? "x" : undefined, "tabular max-w-[10rem] text-lg font-semibold")}
          />
          {quantity && !valid ? (
            <p className="text-sm font-semibold text-danger">Enter a whole number from 1 to {formatCount(available)}.</p>
          ) : null}
        </div>
      </div>

      <section id="supply-preview" aria-live="polite" className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">{valid ? `Your supply list for ${countNoun(n, unitName)}` : "Your supply list"}</h2>
        {valid ? (
          <ul className="mt-2 divide-y divide-line">
            {(requestType === "kit" ? components : components.slice(0, 1)).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-4 py-2">
                <span>
                  {c.name}
                  {c.details ? <span className="block text-sm text-muted">{c.details}</span> : null}
                </span>
                <span className="tabular font-semibold">{formatCount(c.quantityPerUnit * n)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted">Enter a quantity to see what your group will collect.</p>
        )}
      </section>

      <div className="space-y-3 rounded-lg border border-line bg-paper p-4 text-sm">
        <p className="font-semibold text-ink">When you confirm</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>
            {valid ? countNoun(n, unitName) : `The ${units}`} {n === 1 ? "is" : "are"} reserved for your group, so no one else adopts the
            same share.
          </li>
          <li>{orgName} can see your group's name and progress. Your members' names stay within your group.</li>
          <li>
            The quantity and items are fixed for this drive. You can lower your number later, or withdraw; anything already delivered
            still counts.
          </li>
        </ul>
      </div>

      <SubmitButton pendingLabel="Starting the drive…" disabled={!valid}>
        Confirm and start the drive
      </SubmitButton>
    </form>
    </PendingContext>
  );
}
