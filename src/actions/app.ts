"use server";

// Every change a person can make in KitGap goes through one of these server
// actions. Each re-reads who is signed in (getAppContext, via runAction) and
// calls a service in src/server/services, which checks permissions and rules
// inside a database transaction. Nothing here trusts ids from the browser.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { RequestInput } from "@/domain/request-input";
import type { KitMovementRecord } from "@/domain/types";
import type { ActionResult } from "@/lib/action-result";
import { formText, runAction } from "@/server/next/action";
import { adoptRequest, changeCommitmentQuantity, withdrawCommitment } from "@/server/services/drives";
import {
  approveRequest,
  cancelRequest,
  closeRequest,
  copyRequest,
  createRequestDraft,
  deleteDraft,
  reopenRequest,
  returnRequest,
  submitRequestForReview,
  unpublishToDraft,
  updatePublishedDetails,
  updateRequestDraft,
  withdrawFromReview,
  postRequestUpdate,
  SAFE_EDIT_FIELDS,
} from "@/server/services/requests";
import {
  cancelDelivery,
  closePledge,
  createPledge,
  moveKits,
  recordCollection,
  reviewDelivery,
  submitDelivery,
  voidCollection,
} from "@/server/services/supplies";
import {
  createWorkspace,
  joinWorkspace,
  rotateInviteToken,
  setContactConfirmed,
  setMemberRole,
  markUpdatesSeen,
  updateDisplayName,
  updateWorkspace,
  type WorkspaceKind,
} from "@/server/services/workspaces";

type Result<T = unknown> = Promise<ActionResult<T>>;

function parsePayload(formData: FormData): RequestInput {
  try {
    return JSON.parse(formText(formData, "payload")) as RequestInput;
  } catch {
    return {} as RequestInput;
  }
}

// Requests -------------------------------------------------------------------

export async function saveRequestDraftAction(_prev: unknown, formData: FormData): Result<{ requestId: string; savedAt: string }> {
  return runAction(async (ctx) => {
    const fields = parsePayload(formData);
    const requestId = formText(formData, "requestId");
    const result = requestId
      ? await updateRequestDraft(ctx, { requestId, fields })
      : await createRequestDraft(ctx, { orgId: formText(formData, "orgId"), fields, idempotencyKey: formText(formData, "idempotencyKey") });
    return { requestId: result.requestId, savedAt: new Date().toISOString() };
  });
}

export async function submitRequestAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const fields = parsePayload(formData);
    let requestId = formText(formData, "requestId");
    const orgId = formText(formData, "orgId");
    if (!requestId) {
      requestId = (await createRequestDraft(ctx, { orgId, fields, idempotencyKey: formText(formData, "idempotencyKey") })).requestId;
    }
    await submitRequestForReview(ctx, { requestId, fields });
    redirect(`${ctx.base}/organization/${orgId}/requests/${requestId}?submitted=1`);
  });
}

async function requestOp(
  formData: FormData,
  op: (ctx: Parameters<Parameters<typeof runAction>[0]>[0], requestId: string, note: string) => Promise<unknown>,
  after?: (ctx: Parameters<Parameters<typeof runAction>[0]>[0], requestId: string, result: unknown) => void,
): Result {
  return runAction(async (ctx) => {
    const requestId = formText(formData, "requestId");
    const result = await op(ctx, requestId, formText(formData, "note"));
    if (after) after(ctx, requestId, result);
    refresh();
    return { done: true };
  });
}

export async function withdrawFromReviewAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId) => withdrawFromReview(ctx, { requestId }));
}

export async function closeRequestAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId, note) => closeRequest(ctx, { requestId, note }));
}

export async function reopenRequestAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId) => reopenRequest(ctx, { requestId }));
}

export async function cancelRequestAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId, note) => cancelRequest(ctx, { requestId, note }));
}

export async function unpublishRequestAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const requestId = formText(formData, "requestId");
    await unpublishToDraft(ctx, { requestId });
    redirect(`${ctx.base}/organization/${formText(formData, "orgId")}/requests/${requestId}/edit`);
  });
}

export async function copyRequestAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const { requestId } = await copyRequest(ctx, {
      requestId: formText(formData, "requestId"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    redirect(`${ctx.base}/organization/${formText(formData, "orgId")}/requests/${requestId}/edit`);
  });
}

export async function deleteDraftAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const { orgId } = await deleteDraft(ctx, { requestId: formText(formData, "requestId") });
    redirect(`${ctx.base}/organization/${orgId}?deleted=1`);
  });
}

export async function updateDetailsAction(_prev: unknown, formData: FormData): Result<{ changed: string[] }> {
  return runAction(async (ctx) => {
    const fields: Partial<Record<(typeof SAFE_EDIT_FIELDS)[number], string>> = {};
    for (const field of SAFE_EDIT_FIELDS) {
      const value = formData.get(field);
      if (typeof value === "string") fields[field] = value;
    }
    const result = await updatePublishedDetails(ctx, { requestId: formText(formData, "requestId"), fields });
    refresh();
    return { changed: result.changed as string[] };
  });
}

export async function postUpdateAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await postRequestUpdate(ctx, {
      requestId: formText(formData, "requestId"),
      body: formText(formData, "body"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return { done: true };
  });
}

// KitGap reviewers -------------------------------------------------------------

export async function approveRequestAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId) => approveRequest(ctx, { requestId }));
}

export async function returnRequestAction(_prev: unknown, formData: FormData): Result {
  return requestOp(formData, (ctx, requestId, note) => returnRequest(ctx, { requestId, note }));
}

export async function setContactConfirmedAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await setContactConfirmed(ctx, {
      workspaceId: formText(formData, "workspaceId"),
      confirmed: formText(formData, "confirmed") === "true",
    });
    refresh();
    return { done: true };
  });
}

// Drives -----------------------------------------------------------------------

export async function adoptAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const groupChoice = formText(formData, "groupId");
    const { commitmentId } = await adoptRequest(ctx, {
      requestId: formText(formData, "requestId"),
      quantity: formText(formData, "quantity"),
      groupId: groupChoice && groupChoice !== "new" ? groupChoice : null,
      newGroup:
        groupChoice === "new" || !groupChoice
          ? { name: formText(formData, "groupName"), city: formText(formData, "groupCity") }
          : null,
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    redirect(`${ctx.base}/drives/${commitmentId}?started=1`);
  });
}

export async function changeQuantityAction(_prev: unknown, formData: FormData): Result<{ quantity: number }> {
  return runAction(async (ctx) => {
    const result = await changeCommitmentQuantity(ctx, {
      commitmentId: formText(formData, "commitmentId"),
      quantity: formText(formData, "quantity"),
    });
    refresh();
    return { quantity: result.quantity };
  });
}

export async function withdrawDriveAction(_prev: unknown, formData: FormData): Result<{ released: number; stillReserved: number }> {
  return runAction(async (ctx) => {
    const result = await withdrawCommitment(ctx, { commitmentId: formText(formData, "commitmentId"), note: formText(formData, "note") });
    refresh();
    return { released: result.released, stillReserved: result.stillReserved };
  });
}

// Supplies -----------------------------------------------------------------------

export async function pledgeAction(_prev: unknown, formData: FormData): Result<{ pledgeId: string; component: string; quantity: number }> {
  return runAction(async (ctx) => {
    const result = await createPledge(ctx, {
      commitmentId: formText(formData, "commitmentId"),
      componentId: formText(formData, "componentId"),
      quantity: formText(formData, "quantity"),
      note: formText(formData, "note"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return result;
  });
}

export async function closePledgeAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await closePledge(ctx, { pledgeId: formText(formData, "pledgeId") });
    refresh();
    return { done: true };
  });
}

export async function recordCollectionAction(
  _prev: unknown,
  formData: FormData,
): Result<{ entryId: string; component: string; usable: number; unusable: number }> {
  return runAction(async (ctx) => {
    const result = await recordCollection(ctx, {
      commitmentId: formText(formData, "commitmentId"),
      componentId: formText(formData, "componentId"),
      pledgeId: formText(formData, "pledgeId") || null,
      usable: formText(formData, "usable"),
      unusable: formText(formData, "unusable"),
      closeRestOfPledge: formText(formData, "closeRestOfPledge") === "on",
      note: formText(formData, "note"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return result;
  });
}

export async function voidCollectionAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await voidCollection(ctx, { entryId: formText(formData, "entryId"), reason: formText(formData, "reason") });
    refresh();
    return { done: true };
  });
}

export async function moveKitsAction(_prev: unknown, formData: FormData): Result<{ kind: string; quantity: number; unit: string }> {
  return runAction(async (ctx) => {
    const result = await moveKits(ctx, {
      commitmentId: formText(formData, "commitmentId"),
      kind: formText(formData, "kind") as KitMovementRecord["kind"],
      quantity: formText(formData, "quantity"),
      note: formText(formData, "note"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return result;
  });
}

export async function submitDeliveryAction(_prev: unknown, formData: FormData): Result<{ deliveryId: string; quantity: number; unit: string }> {
  return runAction(async (ctx) => {
    const result = await submitDelivery(ctx, {
      commitmentId: formText(formData, "commitmentId"),
      quantity: formText(formData, "quantity"),
      note: formText(formData, "note"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    refresh();
    return result;
  });
}

export async function cancelDeliveryAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await cancelDelivery(ctx, { deliveryId: formText(formData, "deliveryId") });
    refresh();
    return { done: true };
  });
}

export async function reviewDeliveryAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const decision = formText(formData, "decision");
    const quantity = Number(formText(formData, "deliveredQuantity"));
    const accepted = decision === "all" ? String(quantity) : formText(formData, "accepted");
    await reviewDelivery(ctx, {
      deliveryId: formText(formData, "deliveryId"),
      accepted,
      notAccepted: decision === "all" ? "0" : undefined,
      note: formText(formData, "note"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    redirect(`${ctx.base}/organization/${formText(formData, "orgId")}?reviewed=${formText(formData, "deliveryId")}`);
  });
}

// Workspaces and profile ---------------------------------------------------------

export async function createWorkspaceAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const kind = formText(formData, "kind") as WorkspaceKind;
    const { workspaceId } = await createWorkspace(ctx, {
      kind,
      name: formText(formData, "name"),
      city: formText(formData, "city"),
      about: formText(formData, "about"),
      contactName: formText(formData, "contactName"),
      contactEmail: formText(formData, "contactEmail"),
      contactPhone: formText(formData, "contactPhone"),
      idempotencyKey: formText(formData, "idempotencyKey"),
    });
    redirect(kind === "organization" ? `${ctx.base}/organization/${workspaceId}?created=1` : `${ctx.base}/groups/${workspaceId}?created=1`);
  });
}

export async function updateWorkspaceAction(_prev: unknown, formData: FormData): Result<{ contactChanged: boolean }> {
  return runAction(async (ctx) => {
    const result = await updateWorkspace(ctx, {
      workspaceId: formText(formData, "workspaceId"),
      kind: "group",
      name: formText(formData, "name"),
      city: formText(formData, "city"),
      about: formText(formData, "about"),
      contactName: formText(formData, "contactName"),
      contactEmail: formText(formData, "contactEmail"),
      contactPhone: formText(formData, "contactPhone"),
    });
    refresh();
    return { contactChanged: result.contactChanged };
  });
}

export async function joinWorkspaceAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    const result = await joinWorkspace(ctx, { token: formText(formData, "token") });
    redirect(result.kind === "organization" ? `${ctx.base}/organization/${result.workspaceId}?joined=1` : `${ctx.base}/groups/${result.workspaceId}?joined=1`);
  });
}

export async function rotateInviteAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await rotateInviteToken(ctx, { workspaceId: formText(formData, "workspaceId") });
    refresh();
    return { done: true };
  });
}

export async function setMemberRoleAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await setMemberRole(ctx, {
      workspaceId: formText(formData, "workspaceId"),
      memberId: formText(formData, "memberId"),
      role: formText(formData, "role") as "admin" | "member" | "remove",
    });
    refresh();
    return { done: true };
  });
}

export async function updateDisplayNameAction(_prev: unknown, formData: FormData): Result {
  return runAction(async (ctx) => {
    await updateDisplayName(ctx, { displayName: formText(formData, "displayName") });
    refresh();
    return { done: true };
  });
}

export async function markUpdatesSeenAction(): Result {
  return runAction(async (ctx) => {
    await markUpdatesSeen(ctx);
    return { done: true };
  });
}
