"use client";

// The forms inside a drive workspace. Each one posts to a server action; the
// server re-checks the numbers, so the limits shown here are guidance only.

import { useState } from "react";
import {
  cancelDeliveryAction,
  changeQuantityAction,
  closePledgeAction,
  moveKitsAction,
  pledgeAction,
  recordCollectionAction,
  submitDeliveryAction,
  voidCollectionAction,
  withdrawDriveAction,
} from "@/actions/app";
import { countNoun, formatCount, pluralize } from "@/domain/text";
import { ActionForm } from "../ui/action-form";
import { Button, SubmitButton } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { SelectField, TextArea, TextField } from "../ui/field";

const numberProps = { inputMode: "numeric" as const, pattern: "[0-9]*", autoComplete: "off" };

export interface ComponentOption {
  id: string;
  name: string;
  uncovered: number;
  stillNeeded: number;
}

export function PledgeForm({ commitmentId, components }: { commitmentId: string; components: ComponentOption[] }) {
  const open = components.filter((c) => c.uncovered > 0);
  const [componentId, setComponentId] = useState(open[0]?.id ?? "");
  const selected = open.find((c) => c.id === componentId);
  if (open.length === 0) {
    return <p className="text-muted">Everything this drive still needs has been pledged or collected. Thank you!</p>;
  }
  return (
    <ActionForm
      action={pledgeAction}
      hidden={{ commitmentId }}
      success={(data) => {
        const d = data as { component: string; quantity: number };
        return `You pledged ${countNoun(d.quantity, d.component)}. Your coordinator will record them when they arrive.`;
      }}
      aria-label="Pledge supplies"
    >
      {(errors, f) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <SelectField
              id={f("componentId")}
              name="componentId"
              label="Item"
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              error={errors.componentId}
              options={open.map((c) => ({ value: c.id, label: `${c.name} (${formatCount(c.uncovered)} still needed)` }))}
            />
            <TextField
              id={f("quantity")}
              name="quantity"
              label="How many will you bring?"
              hint={selected ? `Up to ${formatCount(selected.uncovered)}` : undefined}
              error={errors.quantity}
              {...numberProps}
              className="sm:max-w-[12rem]"
            />
          </div>
          <TextField id={f("note")} name="note" label="Note for your coordinator" optional maxLength={300} hint="For example, when you'll drop them off" />
          <SubmitButton pendingLabel="Saving pledge…">Pledge these items</SubmitButton>
          <p className="text-sm text-muted">A pledge is a promise, not a delivery. It counts as collected once your coordinator records it.</p>
        </>
      )}
    </ActionForm>
  );
}

export interface PledgeOption {
  id: string;
  componentId: string;
  label: string;
  outstanding: number;
}

export function RecordCollectionForm({
  commitmentId,
  components,
  pledges,
}: {
  commitmentId: string;
  components: { id: string; name: string }[];
  pledges: PledgeOption[];
}) {
  const [pledgeId, setPledgeId] = useState("");
  const [componentId, setComponentId] = useState(components[0]?.id ?? "");
  const pledge = pledges.find((p) => p.id === pledgeId);
  return (
    <ActionForm
      action={recordCollectionAction}
      hidden={{ commitmentId }}
      success={(data) => {
        const d = data as { component: string; usable: number; unusable: number };
        return `Recorded ${formatCount(d.usable)} usable ${(d.usable === 1 ? d.component : pluralize(d.component)).toLowerCase()}${d.unusable ? ` and ${formatCount(d.unusable)} not usable` : ""}. The totals above include them.`;
      }}
      aria-label="Record received supplies"
    >
      {(errors, f) => (
        <>
          {pledges.length > 0 ? (
            <SelectField
              id={f("pledgeId")}
              name="pledgeId"
              label="Is this from a pledge?"
              value={pledgeId}
              onChange={(e) => {
                setPledgeId(e.target.value);
                const p = pledges.find((x) => x.id === e.target.value);
                if (p) setComponentId(p.componentId);
              }}
              options={[{ value: "", label: "No, a separate donation" }, ...pledges.map((p) => ({ value: p.id, label: p.label }))]}
            />
          ) : null}
          {pledge ? <input type="hidden" name="componentId" value={pledge.componentId} /> : null}
          <SelectField
            id={f("componentId")}
            name={pledge ? "componentIdDisplay" : "componentId"}
            label="Item"
            value={componentId}
            disabled={Boolean(pledge)}
            onChange={(e) => setComponentId(e.target.value)}
            error={errors.componentId}
            options={components.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={f("usable")}
              name="usable"
              label="Usable"
              hint="Checked and in acceptable condition"
              error={errors.usable}
              {...numberProps}
            />
            <TextField
              id={f("unusable")}
              name="unusable"
              label="Not usable"
              optional
              hint="Damaged or not what was asked for"
              error={errors.unusable}
              {...numberProps}
            />
          </div>
          {pledge ? (
            <label className="flex items-start gap-3 text-[0.95rem]">
              <input type="checkbox" name="closeRestOfPledge" className="mt-1 size-5 accent-forest" />
              <span>
                Close the rest of this pledge if fewer than {formatCount(pledge.outstanding)} arrived (the contributor isn't bringing
                more)
              </span>
            </label>
          ) : null}
          <TextField id={f("note")} name="note" label="Note" optional maxLength={300} hint="For example, who dropped it off" />
          <SubmitButton pendingLabel="Saving…">Record received supplies</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PackForm({ commitmentId, packableNow, unitName }: { commitmentId: string; packableNow: number; unitName: string }) {
  return (
    <ActionForm
      action={moveKitsAction}
      hidden={{ commitmentId, kind: "packed" }}
      success={(data) => {
        const d = data as { quantity: number; unit: string };
        return `Recorded ${countNoun(d.quantity, d.unit)} packed and ready to hand over.`;
      }}
      aria-label="Record packed kits"
    >
      {(errors, f) => (
        <>
          <TextField
            id={f("quantity")}
            name="quantity"
            label={`How many complete ${pluralize(unitName).toLowerCase()} did you pack?`}
            hint={`You have supplies for up to ${countNoun(packableNow, unitName)}.`}
            error={errors.quantity}
            defaultValue={packableNow > 0 ? String(packableNow) : ""}
            {...numberProps}
            className="max-w-xs"
          />
          <SubmitButton pendingLabel="Saving…" disabled={packableNow === 0}>
            Record packed {pluralize(unitName).toLowerCase()}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function UnpackForm({ commitmentId, ready, unitName }: { commitmentId: string; ready: number; unitName: string }) {
  return (
    <ActionForm action={moveKitsAction} hidden={{ commitmentId, kind: "unpacked" }} success={(data) => `Unpacked ${countNoun((data as { quantity: number }).quantity, unitName)}. Their supplies are back in the collected totals.`} aria-label="Unpack kits">
      {(errors, f) => (
        <>
          <TextField
            id={f("quantity")}
            name="quantity"
            label={`Unpack ${pluralize(unitName).toLowerCase()} (to correct a mistake)`}
            hint={`Up to ${countNoun(ready, unitName)} that haven't been handed over.`}
            error={errors.quantity}
            {...numberProps}
            className="max-w-xs"
          />
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Unpack
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DeliveryForm({
  commitmentId,
  deliverableNow,
  unitName,
  orgName,
}: {
  commitmentId: string;
  deliverableNow: number;
  unitName: string;
  orgName: string;
}) {
  return (
    <ActionForm
      action={submitDeliveryAction}
      hidden={{ commitmentId }}
      success={(data) => `Reported a delivery of ${countNoun((data as { quantity: number }).quantity, unitName)}. ${orgName} will confirm what it received.`}
      aria-label="Report a delivery"
    >
      {(errors, f) => (
        <>
          <TextField
            id={f("quantity")}
            name="quantity"
            label={`How many ${pluralize(unitName).toLowerCase()} did you hand over?`}
            hint={`${countNoun(deliverableNow, unitName)} ready to hand over.`}
            error={errors.quantity}
            defaultValue={deliverableNow > 0 ? String(deliverableNow) : ""}
            {...numberProps}
            className="max-w-xs"
          />
          <TextArea
            id={f("note")}
            name="note"
            label={`Note for ${orgName}`}
            optional
            rows={2}
            maxLength={1000}
            hint="For example, when and where you dropped them off, and who received them"
          />
          <SubmitButton pendingLabel="Reporting…" disabled={deliverableNow === 0}>
            Report delivery
          </SubmitButton>
          <p className="text-sm text-muted">These count as received only after {orgName} confirms them.</p>
        </>
      )}
    </ActionForm>
  );
}

export function FollowUpForms({ commitmentId, needsFollowUp, unitName, active }: { commitmentId: string; needsFollowUp: number; unitName: string; active: boolean }) {
  const units = pluralize(unitName).toLowerCase();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {active ? (
        <ActionForm action={moveKitsAction} hidden={{ commitmentId, kind: "repaired" }} success={(data) => `Marked ${countNoun((data as { quantity: number }).quantity, unitName)} fixed and ready to hand over again.`} aria-label="Mark fixed">
          {(errors, f) => (
            <>
              <TextField
                id={f("quantity")}
                name="quantity"
                label={`Fixed ${units}`}
                hint={`Fixed and ready to hand over again (up to ${formatCount(needsFollowUp)}).`}
                error={errors.quantity}
                {...numberProps}
                className="max-w-xs"
              />
              <TextField id={f("note")} name="note" label="What was fixed?" optional maxLength={300} />
              <SubmitButton pendingLabel="Saving…">Mark as ready again</SubmitButton>
            </>
          )}
        </ActionForm>
      ) : null}
      <ActionForm action={moveKitsAction} hidden={{ commitmentId, kind: "set_aside" }} success={(data) => `Set aside ${countNoun((data as { quantity: number }).quantity, unitName)}. Pack replacements if you can.`} aria-label="Set aside">
        {(errors, f) => (
          <>
            <TextField
              id={f("quantity")}
              name="quantity"
              label={`Set aside ${units}`}
              hint={active ? "They leave this drive; pack replacements from collected supplies." : "They leave this drive."}
              error={errors.quantity}
              {...numberProps}
              className="max-w-xs"
            />
            <TextField id={f("note")} name="note" label="Reason" optional maxLength={300} />
            <SubmitButton variant="secondary" pendingLabel="Saving…">
              Set aside
            </SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}

export function ClosePledgeButton({ pledgeId, label }: { pledgeId: string; label: string }) {
  return (
    <ActionForm action={closePledgeAction} hidden={{ pledgeId }} resetOnSuccess={false}>
      {() => (
        <SubmitButton variant="quiet" size="sm" pendingLabel="Saving…">
          {label}
        </SubmitButton>
      )}
    </ActionForm>
  );
}

export function CancelDeliveryButton({ deliveryId }: { deliveryId: string }) {
  return (
    <ActionForm action={cancelDeliveryAction} hidden={{ deliveryId }} resetOnSuccess={false}>
      {() => (
        <SubmitButton variant="quiet" size="sm" pendingLabel="Taking back…">
          Take back this report
        </SubmitButton>
      )}
    </ActionForm>
  );
}

export function VoidEntryButton({ entryId, label }: { entryId: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="quiet" size="sm" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Remove this entry?" description={label}>
        <ActionForm action={voidCollectionAction} hidden={{ entryId }} onSuccess={() => setOpen(false)}>
          {(errors, f) => (
            <>
              <TextField id={f("reason")} name="reason" label="Why are you removing it?" hint="For example, “typed 50 instead of 5”" error={errors.reason} maxLength={300} />
              <p className="text-sm text-muted">The entry stays in the history, marked as removed, and no longer counts.</p>
              <div className="flex flex-wrap gap-2">
                <SubmitButton variant="danger" pendingLabel="Removing…">
                  Remove entry
                </SubmitButton>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Keep it
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function ChangeQuantityForm({
  commitmentId,
  current,
  minimum,
  maximum,
  unitName,
}: {
  commitmentId: string;
  current: number;
  minimum: number;
  maximum: number;
  unitName: string;
}) {
  return (
    <ActionForm
      action={changeQuantityAction}
      hidden={{ commitmentId }}
      resetOnSuccess={false}
      success={(data) => `Saved. This drive is now for ${countNoun((data as { quantity: number }).quantity, unitName)}.`}
      aria-label="Change quantity"
    >
      {(errors, f) => (
        <>
          <TextField
            id={f("quantity")}
            name="quantity"
            label={`Number of ${pluralize(unitName).toLowerCase()} for this drive`}
            hint={
              maximum > current
                ? `Between ${formatCount(minimum)} and ${formatCount(maximum)} right now.`
                : `You can lower it to ${formatCount(minimum)}. None are left to add.`
            }
            error={errors.quantity}
            defaultValue={String(current)}
            {...numberProps}
            className="max-w-xs"
          />
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Change quantity
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function WithdrawDrive({
  commitmentId,
  releasable,
  pendingReview,
  accepted,
  unitName,
  orgName,
}: {
  commitmentId: string;
  releasable: number;
  pendingReview: number;
  accepted: number;
  unitName: string;
  orgName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Withdraw from this drive
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Withdraw from this drive?">
        <ActionForm action={withdrawDriveAction} hidden={{ commitmentId }} onSuccess={() => setOpen(false)}>
          {(errors, f) => (
            <>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  {countNoun(releasable, unitName)} will be released so another group can adopt {releasable === 1 ? "it" : "them"}.
                </li>
                {accepted > 0 ? <li>{countNoun(accepted, unitName)} already confirmed received still count.</li> : null}
                {pendingReview > 0 ? (
                  <li>
                    {countNoun(pendingReview, unitName)} awaiting {orgName}'s review stay reserved until they decide.
                  </li>
                ) : null}
                <li>Open pledges from your members will be closed.</li>
              </ul>
              <TextArea id={f("note")} name="note" label={`Let ${orgName} know why`} optional rows={2} error={errors.note} maxLength={1000} />
              <div className="flex flex-wrap gap-2">
                <SubmitButton variant="danger" pendingLabel="Withdrawing…">
                  Withdraw
                </SubmitButton>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Keep the drive
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}
