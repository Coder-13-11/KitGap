"use client";

import { useState } from "react";
import {
  cancelRequestAction,
  closeRequestAction,
  copyRequestAction,
  deleteDraftAction,
  postUpdateAction,
  reopenRequestAction,
  unpublishRequestAction,
  updateDetailsAction,
  withdrawFromReviewAction,
} from "@/actions/app";
import { ActionForm } from "../ui/action-form";
import { Button, SubmitButton } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { TextArea, TextField } from "../ui/field";

type Hidden = Record<string, string>;

export function SimpleActionButton({
  action,
  hidden,
  label,
  pendingLabel,
  variant = "secondary",
  success,
}: {
  action: "withdrawReview" | "reopen" | "unpublish" | "copy";
  hidden: Hidden;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  success?: string;
}) {
  const fn = { withdrawReview: withdrawFromReviewAction, reopen: reopenRequestAction, unpublish: unpublishRequestAction, copy: copyRequestAction }[action];
  return (
    <ActionForm action={fn} hidden={hidden} resetOnSuccess={false} success={success}>
      {() => (
        <SubmitButton variant={variant} pendingLabel={pendingLabel}>
          {label}
        </SubmitButton>
      )}
    </ActionForm>
  );
}

export function ConfirmWithNote({
  kind,
  hidden,
  buttonLabel,
  title,
  description,
  noteLabel,
  noteHint,
  noteRequired,
  confirmLabel,
  danger,
}: {
  kind: "close" | "cancel" | "delete";
  hidden: Hidden;
  buttonLabel: string;
  title: string;
  description: React.ReactNode;
  noteLabel?: string;
  noteHint?: string;
  noteRequired?: boolean;
  confirmLabel: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fn = { close: closeRequestAction, cancel: cancelRequestAction, delete: deleteDraftAction }[kind];
  return (
    <>
      <Button variant={danger ? "danger" : "secondary"} onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <ActionForm action={fn} hidden={hidden} onSuccess={() => setOpen(false)}>
          {(errors, f) => (
            <>
              <div className="space-y-2">{description}</div>
              {noteLabel ? (
                <TextArea id={f("note")} name="note" label={noteLabel} hint={noteHint} optional={!noteRequired} error={errors.note} rows={3} maxLength={1000} />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <SubmitButton variant={danger ? "danger" : "primary"} pendingLabel="Saving…">
                  {confirmLabel}
                </SubmitButton>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Go back
                </Button>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function EditDetailsForm({
  requestId,
  values,
}: {
  requestId: string;
  values: {
    need: string;
    beneficiaries: string;
    conditionNotes: string;
    substitutions: string;
    location: string;
    handoverInstructions: string;
    coordinatorContact: string;
    fundraisingUrl: string;
  };
}) {
  return (
    <ActionForm
      action={updateDetailsAction}
      hidden={{ requestId }}
      resetOnSuccess={false}
      success={(data) => ((data as { changed: string[] }).changed.length ? "Saved. Groups running drives can see the changes." : "Nothing changed.")}
    >
      {(errors, f) => (
        <>
          <TextArea id={f("need")} name="need" label="What's the need?" defaultValue={values.need} error={errors.need} rows={4} maxLength={2000} />
          <TextField id={f("beneficiaries")} name="beneficiaries" label="Who will this help?" defaultValue={values.beneficiaries} error={errors.beneficiaries} maxLength={500} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea id={f("conditionNotes")} name="conditionNotes" label="Accepted condition" optional defaultValue={values.conditionNotes} error={errors.conditionNotes} rows={2} maxLength={1000} />
            <TextArea id={f("substitutions")} name="substitutions" label="Accepted substitutions" optional defaultValue={values.substitutions} error={errors.substitutions} rows={2} maxLength={1000} />
          </div>
          <TextField id={f("location")} name="location" label="General location" defaultValue={values.location} error={errors.location} maxLength={120} />
          <TextArea id={f("handoverInstructions")} name="handoverInstructions" label="Handover instructions (private)" optional defaultValue={values.handoverInstructions} error={errors.handoverInstructions} rows={3} maxLength={2000} />
          <TextField id={f("coordinatorContact")} name="coordinatorContact" label="Contact for groups (private)" optional defaultValue={values.coordinatorContact} error={errors.coordinatorContact} maxLength={300} />
          <TextField id={f("fundraisingUrl")} name="fundraisingUrl" type="url" label="External fundraising link" optional defaultValue={values.fundraisingUrl} error={errors.fundraisingUrl} maxLength={500} hint="Must start with https://" />
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Save details
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PostUpdateForm({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={postUpdateAction} hidden={{ requestId }} success="Update posted on the request page.">
      {(errors, f) => (
        <>
          <TextArea
            id={f("body")}
            name="body"
            label="Post an update"
            hint="Shown publicly on the request page, for example “We've received 40 kits so far. Thank you!” Don't include anything private."
            error={errors.body}
            rows={3}
            maxLength={1000}
          />
          <SubmitButton variant="secondary" pendingLabel="Posting…">
            Post update
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
