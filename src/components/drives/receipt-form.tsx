"use client";

// The recipient's decision through a receipt link: accept everything, or say
// how many were acceptable and what was wrong. They sign with their name;
// they don't need a KitGap account.

import { useState } from "react";
import { reviewByReceiptAction } from "@/actions/club-drives";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { Fieldset, TextArea, TextField } from "../ui/field";

export function ReceiptForm({
  token,
  quantity,
  unitName,
  groupName,
}: {
  token: string;
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
    <ActionForm action={reviewByReceiptAction} hidden={{ token, deliveredQuantity: String(quantity), decision }} resetOnSuccess={false}>
      {(errors, f) => (
        <>
          <Fieldset legend={`Did all ${countNoun(quantity, unitName)} arrive complete and in good condition?`} id={f("decision")}>
            <label className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong bg-surface px-3 py-3 has-[:checked]:border-forest has-[:checked]:bg-forest-tint">
              <input type="radio" name="decisionChoice" checked={decision === "all"} onChange={() => setDecision("all")} className="mt-1 size-5 accent-forest" />
              <span>
                <span className="font-semibold">Yes, all {formatCount(quantity)}</span>
                <span className="block text-sm text-muted">Each one has everything on the list below.</span>
              </span>
            </label>
            <label className="flex min-h-12 items-start gap-3 rounded-md border border-line-strong bg-surface px-3 py-3 has-[:checked]:border-forest has-[:checked]:bg-forest-tint">
              <input type="radio" name="decisionChoice" checked={decision === "partial"} onChange={() => setDecision("partial")} className="mt-1 size-5 accent-forest" />
              <span>
                <span className="font-semibold">Only some of them</span>
                <span className="block text-sm text-muted">Something was missing or damaged, or fewer arrived.</span>
              </span>
            </label>
          </Fieldset>

          {decision === "partial" ? (
            <div className="space-y-4 rounded-md border border-line bg-paper p-4">
              <TextField
                id={f("accepted")}
                name="accepted"
                label={`How many ${units} are complete and usable?`}
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
                  <span className="font-semibold">
                    {countNoun(notAccepted, unitName)} go back to {groupName} to fix.
                  </span>
                ) : n !== null ? (
                  <span className="font-semibold text-danger">That&rsquo;s more than the {formatCount(quantity)} handed over.</span>
                ) : null}
              </p>
              {errors.notAccepted ? <p className="text-sm font-semibold text-danger">{errors.notAccepted}</p> : null}
              <TextArea
                id={f("note")}
                name="note"
                label="What was wrong or missing?"
                hint={`${groupName} sees this so they can fix it.`}
                error={errors.note}
                rows={3}
                maxLength={1000}
              />
            </div>
          ) : (
            <TextArea id={f("note")} name="note" label={`Message for ${groupName}`} optional rows={2} maxLength={1000} />
          )}

          <TextField
            id={f("signedName")}
            name="signedName"
            label="Your name"
            hint="For example “Maya, front desk”. The club sees it with your confirmation."
            error={errors.signedName}
            autoComplete="name"
            maxLength={120}
            className="max-w-md"
          />

          <SubmitButton pendingLabel="Confirming…">Confirm what arrived</SubmitButton>
          <p className="text-sm text-muted">You can confirm once. Check the kits before you do.</p>
        </>
      )}
    </ActionForm>
  );
}
