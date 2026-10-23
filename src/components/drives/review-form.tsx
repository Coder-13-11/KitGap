"use client";

// The receiving organization's decision on one delivery: accept everything,
// or record how many were acceptable and explain what wasn't.

import { useState } from "react";
import { reviewDeliveryAction } from "@/actions/app";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { Fieldset, TextArea, TextField } from "../ui/field";

export function ReviewDeliveryForm({
  deliveryId,
  orgId,
  quantity,
  unitName,
  groupName,
}: {
  deliveryId: string;
  orgId: string;
  quantity: number;
  unitName: string;
  groupName: string;
}) {
  const [decision, setDecision] = useState<"all" | "partial">("all");
  const [accepted, setAccepted] = useState("");
  const n = /^\d+$/.test(accepted) ? Number(accepted) : null;
  const notAccepted = n !== null && n <= quantity ? quantity - n : null;
  const units = pluralize(unitName).toLowerCase();

  return (
    <ActionForm action={reviewDeliveryAction} hidden={{ deliveryId, orgId, deliveredQuantity: String(quantity), decision }} resetOnSuccess={false}>
      {(errors, f) => (
        <>
          <Fieldset legend={`Did all ${countNoun(quantity, unitName)} arrive in acceptable condition?`} id={f("decision")}>
            <label className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong bg-surface px-3 py-3">
              <input type="radio" name="decisionChoice" checked={decision === "all"} onChange={() => setDecision("all")} className="mt-1 size-5 accent-forest" />
              <span>
                <span className="font-semibold">Yes, accept all {formatCount(quantity)}</span>
                <span className="block text-sm text-muted">They count as received right away.</span>
              </span>
            </label>
            <label className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong bg-surface px-3 py-3">
              <input type="radio" name="decisionChoice" checked={decision === "partial"} onChange={() => setDecision("partial")} className="mt-1 size-5 accent-forest" />
              <span>
                <span className="font-semibold">No, only some (or none) are acceptable</span>
                <span className="block text-sm text-muted">For example, items were missing or damaged, or fewer arrived than reported.</span>
              </span>
            </label>
          </Fieldset>

          {decision === "partial" ? (
            <div className="space-y-4 rounded-md border border-line bg-paper p-4">
              <TextField
                id={f("accepted")}
                name="accepted"
                label={`How many ${units} are you accepting?`}
                hint={`From 0 to ${formatCount(quantity)}.`}
                error={errors.accepted}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={accepted}
                onChange={(e) => setAccepted(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                className="max-w-xs"
              />
              <p aria-live="polite" className="text-sm">
                {notAccepted !== null ? (
                  <>
                    <span className="font-semibold">{countNoun(notAccepted, unitName)} not accepted.</span> They go back to {groupName} to
                    fix or replace, and don't count toward the request.
                  </>
                ) : n !== null ? (
                  <span className="font-semibold text-danger">That's more than the {formatCount(quantity)} delivered.</span>
                ) : null}
              </p>
              {errors.notAccepted ? <p className="text-sm font-semibold text-danger">{errors.notAccepted}</p> : null}
              <TextArea
                id={f("note")}
                name="note"
                label="What was wrong or missing?"
                hint={`${groupName} will see this, so they can fix it.`}
                error={errors.note}
                rows={3}
                maxLength={1000}
              />
            </div>
          ) : (
            <TextArea id={f("note")} name="note" label={`Message for ${groupName}`} optional rows={2} maxLength={1000} hint="For example, a thank-you" />
          )}

          <SubmitButton pendingLabel="Saving decision…">Save decision</SubmitButton>
          <p className="text-sm text-muted">You can record a decision once. If you're unsure, check the delivery first.</p>
        </>
      )}
    </ActionForm>
  );
}
