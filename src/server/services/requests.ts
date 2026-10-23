// Creating, reviewing, publishing and closing requests.
//
// Lifecycle: draft -> in_review -> published -> (closed <-> published) / cancelled.
// A reviewer can return an in_review request to draft with a note.
// Once any drive is active, the target and recipe are frozen: changing them
// would silently change what groups already promised. The organization can
// copy the request into a new draft instead.

import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import { validateRequestInput, type CleanRequest, type RequestInput } from "@/domain/request-input";
import type { Tx } from "../db/client";
import {
  assertInvariants,
  loadRequestState,
  logActivity,
  mutate,
  newId,
  now,
  requirePlatformAdmin,
  requireRole,
  type ServiceContext,
} from "./core";

function fieldError(errors: Record<string, string>): never {
  throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: errors });
}

async function writeComponents(tx: Tx, requestId: string, clean: CleanRequest) {
  await tx`delete from request_components where request_id = ${requestId}`;
  for (const [position, component] of clean.components.entries()) {
    await tx`
      insert into request_components ${tx({
        requestId,
        position,
        name: component.name,
        normalizedKey: component.normalizedKey,
        quantityPerUnit: component.quantityPerUnit,
        details: component.details,
      })}
    `;
  }
}

function requestColumns(clean: CleanRequest) {
  return {
    title: clean.title,
    need: clean.need,
    beneficiaries: clean.beneficiaries,
    category: clean.category,
    requestType: clean.requestType,
    unitName: clean.unitName,
    targetQuantity: clean.targetQuantity,
    conditionNotes: clean.conditionNotes,
    substitutions: clean.substitutions,
    neededBy: clean.neededBy,
    timezone: clean.timezone,
    location: clean.location,
    handoverInstructions: clean.handoverInstructions,
    coordinatorContact: clean.coordinatorContact,
    fundraisingUrl: clean.fundraisingUrl,
  };
}

export async function createRequestDraft(
  ctx: ServiceContext,
  input: { orgId: string; fields: RequestInput; idempotencyKey?: string },
): Promise<{ requestId: string }> {
  return mutate(ctx, { action: "request.create", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    await requireRole(tx, input.orgId, userId, "member", "Only members of this organization can create its requests.");
    const [org] = await tx`select kind from workspaces where id = ${input.orgId}`;
    if (org?.kind !== "organization") throw new DomainError("not_allowed", "Requests belong to an organization.");
    const { value, errors } = validateRequestInput(input.fields, "draft", now(ctx));
    if (Object.keys(errors).length > 0) fieldError(errors);
    const requestId = newId();
    await tx`
      insert into requests ${tx({ id: requestId, orgId: input.orgId, createdBy: userId, ...requestColumns(value) })}
    `;
    await writeComponents(tx, requestId, value);
    await logActivity(tx, { kind: "request.created", audience: "org", actorId: userId, requestId, workspaceId: input.orgId });
    return { requestId };
  });
}

// Saves a draft step. Only drafts accept full edits.
export async function updateRequestDraft(
  ctx: ServiceContext,
  input: { requestId: string; fields: RequestInput },
): Promise<{ requestId: string }> {
  return mutate(ctx, { action: "request.update" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "member", "Only members of this organization can edit its requests.");
    if (state.request.status !== "draft") {
      throw new DomainError("conflict", "This request is no longer a draft. Reload the page to see its current state.");
    }
    const { value, errors } = validateRequestInput(input.fields, "draft", now(ctx));
    if (Object.keys(errors).length > 0) fieldError(errors);
    await tx`update requests set ${tx({ ...requestColumns(value), updatedAt: now(ctx) })} where id = ${input.requestId}`;
    await writeComponents(tx, input.requestId, value);
    return { requestId: input.requestId };
  });
}

export async function submitRequestForReview(
  ctx: ServiceContext,
  input: { requestId: string; fields: RequestInput },
): Promise<{ requestId: string }> {
  return mutate(ctx, { action: "request.submit" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "member", "Only members of this organization can submit its requests.");
    if (state.request.status !== "draft") {
      throw new DomainError("conflict", "This request was already submitted. Reload the page to see its current state.");
    }
    const { value, errors } = validateRequestInput(input.fields, "submit", now(ctx));
    if (Object.keys(errors).length > 0) fieldError(errors);
    await tx`
      update requests
      set ${tx({ ...requestColumns(value), status: "in_review", statusNote: "", submittedAt: now(ctx), updatedAt: now(ctx) })}
      where id = ${input.requestId}
    `;
    await writeComponents(tx, input.requestId, value);
    await logActivity(tx, {
      kind: "request.submitted",
      audience: "org",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
    });
    return { requestId: input.requestId };
  });
}

// The organization pulls a submitted request back to edit it.
export async function withdrawFromReview(ctx: ServiceContext, input: { requestId: string }) {
  return mutate(ctx, { action: "request.unsubmit" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "member");
    if (state.request.status !== "in_review") {
      throw new DomainError("conflict", "This request isn't waiting for review any more. Reload to see its current state.");
    }
    await tx`update requests set status = 'draft', status_note = '', updated_at = ${now(ctx)} where id = ${input.requestId}`;
    return { requestId: input.requestId };
  });
}

// KitGap reviewer decisions -------------------------------------------------

export async function approveRequest(ctx: ServiceContext, input: { requestId: string }) {
  return mutate(ctx, { action: "request.approve" }, async (tx, userId) => {
    await requirePlatformAdmin(tx, userId);
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    if (state.request.status !== "in_review") {
      throw new DomainError("conflict", "This request isn't waiting for review. Reload to see its current state.");
    }
    // Re-check the full request at approval time (dates may have passed).
    const { errors } = validateRequestInput(requestToInput(state.request, state.components), "submit", now(ctx));
    if (Object.keys(errors).length > 0) {
      throw new DomainError(
        "invalid_input",
        "This request can't be published as it stands (for example, its needed-by date has passed). Return it with a note instead.",
      );
    }
    await tx`
      update requests
      set status = 'published', status_note = '', published_at = ${now(ctx)}, reviewed_by = ${userId}, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.published",
      audience: "org",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
    });
    return { requestId: input.requestId };
  });
}

export async function returnRequest(ctx: ServiceContext, input: { requestId: string; note: string }) {
  return mutate(ctx, { action: "request.return" }, async (tx, userId) => {
    await requirePlatformAdmin(tx, userId);
    const note = input.note.trim();
    if (note.length < 5) fieldError({ note: "Tell the organization what to change" });
    if (note.length > 1000) fieldError({ note: "Keep the note to 1,000 characters or fewer" });
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    if (state.request.status !== "in_review") {
      throw new DomainError("conflict", "This request isn't waiting for review. Reload to see its current state.");
    }
    await tx`
      update requests set status = 'draft', status_note = ${note}, reviewed_by = ${userId}, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.returned",
      audience: "org",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
      data: { note },
    });
    return { requestId: input.requestId };
  });
}

// Organization decisions after publishing -----------------------------------

export async function closeRequest(ctx: ServiceContext, input: { requestId: string; note: string }) {
  return mutate(ctx, { action: "request.close" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "admin", "Only organization managers can close a request.");
    if (state.request.status !== "published") {
      throw new DomainError("conflict", "Only an open request can be closed. Reload to see its current state.");
    }
    const note = input.note.trim().slice(0, 1000);
    await tx`
      update requests set status = 'closed', status_note = ${note}, closed_at = ${now(ctx)}, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.closed",
      audience: "both",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
      data: { note },
    });
    return { requestId: input.requestId };
  });
}

export async function reopenRequest(ctx: ServiceContext, input: { requestId: string }) {
  return mutate(ctx, { action: "request.reopen" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "admin", "Only organization managers can reopen a request.");
    if (state.request.status !== "closed") {
      throw new DomainError("conflict", "This request isn't closed. Reload to see its current state.");
    }
    await tx`
      update requests set status = 'published', status_note = '', closed_at = null, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.reopened",
      audience: "both",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
    });
    return { requestId: input.requestId };
  });
}

// Cancelling keeps every drive, delivery and review on record. Drives can't
// hand over anything new; deliveries already submitted can still be reviewed.
export async function cancelRequest(ctx: ServiceContext, input: { requestId: string; note: string }) {
  return mutate(ctx, { action: "request.cancel" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "admin", "Only organization managers can cancel a request.");
    const note = input.note.trim();
    if (note.length < 5) fieldError({ note: "Explain to the groups why this request is cancelled" });
    if (note.length > 1000) fieldError({ note: "Keep the note to 1,000 characters or fewer" });
    if (state.request.status === "cancelled") {
      throw new DomainError("conflict", "This request is already cancelled.");
    }
    if (state.request.status === "draft" || state.request.status === "in_review") {
      throw new DomainError("conflict", "Drafts can't be cancelled. Delete the draft instead.");
    }
    await tx`
      update requests set status = 'cancelled', status_note = ${note}, cancelled_at = ${now(ctx)}, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.cancelled",
      audience: "both",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
      data: { note },
    });
    await assertInvariants(tx, input.requestId);
    return { requestId: input.requestId };
  });
}

export async function deleteDraft(ctx: ServiceContext, input: { requestId: string }) {
  return mutate(ctx, { action: "request.delete" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "member");
    if (state.request.status !== "draft") {
      throw new DomainError("conflict", "Only drafts can be deleted.");
    }
    await tx`delete from activity where request_id = ${input.requestId}`;
    await tx`update requests set copied_from = null where copied_from = ${input.requestId}`;
    await tx`delete from requests where id = ${input.requestId}`;
    return { orgId: state.request.orgId };
  });
}

// Before any group has started a drive, the organization can take a published
// request back to draft to change its quantity or recipe. It is reviewed again.
export async function unpublishToDraft(ctx: ServiceContext, input: { requestId: string }) {
  return mutate(ctx, { action: "request.unpublish" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "admin", "Only organization managers can change a published request.");
    if (state.request.status !== "published" && state.request.status !== "closed") {
      throw new DomainError("conflict", "This request isn't published. Reload to see its current state.");
    }
    if (state.commitments.length > 0) {
      throw new DomainError(
        "conflict",
        "A group has already started a drive, so the quantity and items are fixed. Copy this request into a new draft instead.",
      );
    }
    await tx`
      update requests set status = 'draft', status_note = '', published_at = null, closed_at = null, updated_at = ${now(ctx)}
      where id = ${input.requestId}
    `;
    await logActivity(tx, {
      kind: "request.unpublished",
      audience: "org",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
    });
    return { requestId: input.requestId };
  });
}

// Copies any request into a new draft, for changing requirements without
// touching what existing drives committed to.
export async function copyRequest(ctx: ServiceContext, input: { requestId: string; idempotencyKey?: string }) {
  return mutate(ctx, { action: "request.copy", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: false });
    await requireRole(tx, state.request.orgId, userId, "member");
    const fields = requestToInput(state.request, state.components);
    const { value } = validateRequestInput({ ...fields, title: `Copy of ${state.request.title}`.slice(0, 140) }, "draft", now(ctx));
    const requestId = newId();
    await tx`
      insert into requests ${tx({
        id: requestId,
        orgId: state.request.orgId,
        createdBy: userId,
        copiedFrom: state.request.id,
        ...requestColumns(value),
      })}
    `;
    await writeComponents(tx, requestId, value);
    await logActivity(tx, {
      kind: "request.created",
      audience: "org",
      actorId: userId,
      requestId,
      workspaceId: state.request.orgId,
      data: { copiedFrom: state.request.id },
    });
    return { requestId };
  });
}

// Descriptive edits that never change what a drive committed to.
export const SAFE_EDIT_FIELDS = [
  "need",
  "beneficiaries",
  "conditionNotes",
  "substitutions",
  "location",
  "handoverInstructions",
  "coordinatorContact",
  "fundraisingUrl",
] as const;

export async function updatePublishedDetails(
  ctx: ServiceContext,
  input: { requestId: string; fields: Partial<Record<(typeof SAFE_EDIT_FIELDS)[number], string>> },
) {
  return mutate(ctx, { action: "request.edit_details" }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    await requireRole(tx, state.request.orgId, userId, "admin", "Only organization managers can edit a published request.");
    if (!acceptsDeliveries(state.request.status)) {
      throw new DomainError("conflict", "This request can't be edited in its current state.");
    }
    const merged = { ...requestToInput(state.request, state.components) };
    for (const field of SAFE_EDIT_FIELDS) {
      const value = input.fields[field];
      if (typeof value === "string") merged[field] = value;
    }
    // Validate as a complete request, but don't re-check the date against
    // today: the needed-by date itself isn't editable here.
    const { value, errors } = validateRequestInput(merged, "submit", new Date(`${state.request.neededBy}T12:00:00Z`));
    const relevant = Object.fromEntries(
      Object.entries(errors).filter(([field]) => (SAFE_EDIT_FIELDS as readonly string[]).includes(field)),
    );
    if (Object.keys(relevant).length > 0) fieldError(relevant);
    const changed = SAFE_EDIT_FIELDS.filter((field) => (state.request[field] ?? "") !== (value[field] ?? ""));
    if (changed.length === 0) return { requestId: input.requestId, changed };
    const updates: Record<string, unknown> = { updatedAt: now(ctx) };
    for (const field of changed) updates[field] = value[field];
    await tx`update requests set ${tx(updates)} where id = ${input.requestId}`;
    await logActivity(tx, {
      kind: "request.details_updated",
      audience: "both",
      actorId: userId,
      requestId: input.requestId,
      workspaceId: state.request.orgId,
      data: { fields: changed },
    });
    return { requestId: input.requestId, changed };
  });
}

export function requestToInput(
  request: import("@/domain/types").RequestRecord,
  components: import("@/domain/types").ComponentRecord[],
): RequestInput {
  return {
    title: request.title,
    need: request.need,
    beneficiaries: request.beneficiaries,
    category: request.category,
    requestType: request.requestType,
    unitName: request.unitName,
    targetQuantity: request.targetQuantity === null ? "" : String(request.targetQuantity),
    components:
      components.length > 0
        ? components.map((c) => ({ name: c.name, quantityPerUnit: String(c.quantityPerUnit), details: c.details }))
        : [{ name: "", quantityPerUnit: "1", details: "" }],
    conditionNotes: request.conditionNotes,
    substitutions: request.substitutions,
    neededBy: request.neededBy ?? "",
    timezone: request.timezone,
    location: request.location,
    handoverInstructions: request.handoverInstructions,
    coordinatorContact: request.coordinatorContact,
    fundraisingUrl: request.fundraisingUrl ?? "",
  };
}
