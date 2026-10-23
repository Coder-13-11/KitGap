"use client";

import { approveRequestAction, returnRequestAction, setContactConfirmedAction } from "@/actions/app";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { TextArea } from "../ui/field";

export function ApproveButton({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={approveRequestAction} hidden={{ requestId }} resetOnSuccess={false}>
      {() => <SubmitButton pendingLabel="Publishing…">Approve and publish</SubmitButton>}
    </ActionForm>
  );
}

export function ReturnForm({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={returnRequestAction} hidden={{ requestId }}>
      {(errors, f) => (
        <>
          <TextArea id={f("note")} name="note" label="Return with a note" hint="Tell the organization what to change. They'll see this note." error={errors.note} rows={2} maxLength={1000} />
          <SubmitButton variant="secondary" pendingLabel="Returning…">
            Return for changes
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ContactConfirmButton({ workspaceId, confirmed }: { workspaceId: string; confirmed: boolean }) {
  return (
    <ActionForm action={setContactConfirmedAction} hidden={{ workspaceId, confirmed: String(!confirmed) }} resetOnSuccess={false}>
      {() => (
        <SubmitButton variant={confirmed ? "quiet" : "secondary"} size="sm" pendingLabel="Saving…">
          {confirmed ? "Remove confirmation" : "Mark contact confirmed"}
        </SubmitButton>
      )}
    </ActionForm>
  );
}
