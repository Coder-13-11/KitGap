"use client";

import { createWorkspaceAction, joinWorkspaceAction, rotateInviteAction, setMemberRoleAction, updateWorkspaceAction } from "@/actions/app";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { TextArea, TextField } from "../ui/field";

export interface WorkspaceValues {
  name: string;
  city: string;
  about: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export function WorkspaceForm({
  kind,
  workspaceId,
  values,
}: {
  kind: "organization" | "group";
  workspaceId?: string;
  values?: WorkspaceValues;
}) {
  const isOrg = kind === "organization";
  return (
    <ActionForm
      action={workspaceId ? updateWorkspaceAction : createWorkspaceAction}
      hidden={workspaceId ? { workspaceId } : { kind }}
      resetOnSuccess={false}
      success={
        workspaceId
          ? (data) =>
              (data as { contactChanged: boolean }).contactChanged
                ? "Saved. Because the contact changed, a KitGap reviewer will confirm it again."
                : "Saved."
          : undefined
      }
    >
      {(errors, f) => (
        <>
          <TextField
            id={f("name")}
            name="name"
            label={isOrg ? "Organization name" : "Group name"}
            hint={isOrg ? "As the public knows it. Shown on your requests." : "Shown publicly on drives, for example “Lakeside High Key Club”."}
            defaultValue={values?.name}
            error={errors.name}
            autoComplete="organization"
            maxLength={120}
          />
          <TextField
            id={f("city")}
            name="city"
            label="City or area"
            hint="For example “Kissimmee, FL”. Shown publicly."
            defaultValue={values?.city}
            error={errors.city}
            maxLength={120}
            className="max-w-md"
          />
          <TextArea
            id={f("about")}
            name="about"
            label={isOrg ? "About your organization" : "About your group"}
            optional
            defaultValue={values?.about}
            error={errors.about}
            rows={3}
            maxLength={1000}
          />
          {isOrg ? (
            <fieldset className="space-y-4 rounded-md border border-line bg-paper p-4">
              <legend className="px-1 font-semibold">Contact for KitGap reviewers (private)</legend>
              <p className="text-sm text-muted">
                A KitGap reviewer uses this to confirm your organization is real before your requests are listed. It's never shown publicly.
              </p>
              <TextField id={f("contactName")} name="contactName" label="Contact person" defaultValue={values?.contactName} error={errors.contactName} autoComplete="name" maxLength={120} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id={f("contactEmail")} name="contactEmail" type="email" label="Work email" defaultValue={values?.contactEmail} error={errors.contactEmail} autoComplete="email" maxLength={200} hint="Email or phone is required" />
                <TextField id={f("contactPhone")} name="contactPhone" type="tel" label="Phone" optional defaultValue={values?.contactPhone} error={errors.contactPhone} autoComplete="tel" maxLength={40} />
              </div>
            </fieldset>
          ) : null}
          <SubmitButton pendingLabel="Saving…">{workspaceId ? "Save changes" : isOrg ? "Register organization" : "Create group"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function JoinButton({ token, label }: { token: string; label: string }) {
  return (
    <ActionForm action={joinWorkspaceAction} hidden={{ token }} resetOnSuccess={false}>
      {() => <SubmitButton pendingLabel="Joining…">{label}</SubmitButton>}
    </ActionForm>
  );
}

export function RotateInviteButton({ workspaceId }: { workspaceId: string }) {
  return (
    <ActionForm action={rotateInviteAction} hidden={{ workspaceId }} resetOnSuccess={false} success="New link created. The old link no longer works.">
      {() => (
        <SubmitButton variant="quiet" size="sm" pendingLabel="Creating…">
          Replace the invitation link
        </SubmitButton>
      )}
    </ActionForm>
  );
}

export function MemberRoleButton({
  workspaceId,
  memberId,
  role,
  label,
}: {
  workspaceId: string;
  memberId: string;
  role: "admin" | "member" | "remove";
  label: string;
}) {
  return (
    <ActionForm action={setMemberRoleAction} hidden={{ workspaceId, memberId, role }} resetOnSuccess={false}>
      {() => (
        <SubmitButton variant={role === "remove" ? "danger" : "quiet"} size="sm" pendingLabel="Saving…">
          {label}
        </SubmitButton>
      )}
    </ActionForm>
  );
}
