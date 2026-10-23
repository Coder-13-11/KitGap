// Starting a drive (adopting part of a request) and changing or withdrawing it.
//
// Every function here locks the request row first (loadRequestState with
// lock: true). Two groups adopting the last kits at the same moment are
// therefore handled one after the other: the second sees the first's
// commitment and is told how many are left, instead of both succeeding.

import { DomainError } from "@/domain/errors";
import { acceptsDeliveries, requestPhase } from "@/domain/phase";
import { countNoun } from "@/domain/text";
import {
  assertInvariants,
  loadDriveState,
  loadRequestState,
  logActivity,
  mutate,
  newId,
  now,
  progressOf,
  requireRole,
  totalsOf,
  type ServiceContext,
} from "./core";
import { insertWorkspace, validateWorkspaceInput } from "./workspaces";

export function parseQuantity(value: unknown, field = "quantity"): number {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/,/g, "") : "";
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 100_000) {
    throw new DomainError("invalid_input", "Some answers need attention.", {
      fieldErrors: { [field]: "Enter a whole number of at least 1" },
    });
  }
  return Number(raw);
}

export function unitWord(request: { requestType: "kit" | "item"; unitName: string }) {
  return request.unitName || (request.requestType === "kit" ? "kit" : "item");
}

export interface AdoptInput {
  requestId: string;
  quantity: unknown;
  groupId?: string | null;
  newGroup?: { name: string; city: string } | null;
  idempotencyKey?: string;
}

export async function adoptRequest(ctx: ServiceContext, input: AdoptInput): Promise<{ commitmentId: string; groupId: string }> {
  return mutate(ctx, { action: "drive.start", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await loadRequestState(tx, input.requestId, { lock: true });
    const { request } = state;
    const totals = totalsOf(state);
    const phase = requestPhase(request, totals, now(ctx));
    const unit = unitWord(request);

    if (phase !== "open") {
      const message: Record<string, string> = {
        draft: "This request isn't published.",
        returned: "This request isn't published.",
        in_review: "This request isn't published yet.",
        fully_committed: `Other groups have now promised all ${countNoun(totals.target, unit)}. None are left to adopt.`,
        past_due: "The needed-by date for this request has passed, so new drives can't start.",
        closed: "The organization has closed this request to new drives.",
        fulfilled: "This request has been fulfilled.",
        cancelled: "The organization cancelled this request.",
      };
      throw new DomainError(phase === "fully_committed" ? "conflict" : "closed", message[phase] ?? "This request isn't open.", {
        details: { available: totals.available },
      });
    }

    const quantity = parseQuantity(input.quantity);

    let groupId = input.groupId ?? null;
    if (groupId) {
      await requireRole(tx, groupId, userId, "admin", "Only a group's coordinators can start a drive for it.");
      const [group] = await tx`select kind from workspaces where id = ${groupId}`;
      if (group?.kind !== "group") throw new DomainError("not_allowed", "Choose a school club or community group.");
      const [existing] = await tx`
        select id from commitments where request_id = ${request.id} and group_id = ${groupId} and status = 'active'
      `;
      if (existing) {
        throw new DomainError(
          "conflict",
          "Your group already has a drive for this request. Change its quantity from the drive page instead.",
          { details: { commitmentId: existing.id } },
        );
      }
    } else if (input.newGroup) {
      const errors = validateWorkspaceInput({ kind: "group", ...input.newGroup });
      if (Object.keys(errors).length > 0) {
        const fieldErrors = Object.fromEntries(Object.entries(errors).map(([k, v]) => [`group.${k}`, v]));
        throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors });
      }
    } else {
      throw new DomainError("invalid_input", "Some answers need attention.", {
        fieldErrors: { groupId: "Choose the group running this drive" },
      });
    }

    if (quantity > totals.available) {
      throw new DomainError(
        "conflict",
        `Only ${countNoun(totals.available, unit)} ${totals.available === 1 ? "is" : "are"} still available. Another group may have just started a drive. Choose ${totals.available} or fewer.`,
        { details: { available: totals.available }, fieldErrors: { quantity: `Choose ${totals.available} or fewer` } },
      );
    }

    if (!groupId && input.newGroup) {
      groupId = (await insertWorkspace(tx, userId, { kind: "group", ...input.newGroup })).workspaceId;
    }

    const commitmentId = newId();
    await tx`
      insert into commitments ${tx({ id: commitmentId, requestId: request.id, groupId, quantity, createdBy: userId })}
    `;
    await logActivity(tx, {
      kind: "drive.started",
      audience: "both",
      actorId: userId,
      requestId: request.id,
      commitmentId,
      workspaceId: groupId,
      data: { quantity },
    });
    await assertInvariants(tx, request.id, commitmentId);
    return { commitmentId, groupId: groupId! };
  });
}

export async function changeCommitmentQuantity(ctx: ServiceContext, input: { commitmentId: string; quantity: unknown }) {
  return mutate(ctx, { action: "drive.change_quantity" }, async (tx, userId) => {
    const state = await loadDriveState(tx, input.commitmentId, { lock: true });
    const { request, commitment } = state;
    await requireRole(tx, commitment.groupId, userId, "admin", "Only the group's coordinators can change the drive.");
    if (commitment.status !== "active") throw new DomainError("conflict", "This drive was withdrawn.");
    if (!acceptsDeliveries(request.status)) {
      throw new DomainError("closed", "This request was cancelled, so the drive can't be changed.");
    }
    const quantity = parseQuantity(input.quantity);
    const unit = unitWord(request);
    const from = commitment.quantity;
    if (quantity === from) return { commitmentId: commitment.id, quantity };

    if (quantity > from) {
      const totals = totalsOf(state);
      const phase = requestPhase(request, totals, now(ctx));
      if (phase !== "open") {
        throw new DomainError("closed", "This request isn't open for more commitments, so the drive can't grow.");
      }
      const extra = quantity - from;
      if (extra > totals.available) {
        throw new DomainError(
          "conflict",
          `Only ${countNoun(totals.available, unit)} more ${totals.available === 1 ? "is" : "are"} available, so this drive can grow to at most ${from + totals.available}.`,
          { details: { available: totals.available }, fieldErrors: { quantity: `Choose ${from + totals.available} or fewer` } },
        );
      }
    } else {
      const { stages } = progressOf(state);
      const minimum =
        stages.accepted + stages.pendingReview + stages.needsFollowUp + (request.requestType === "kit" ? stages.ready : 0);
      if (quantity < Math.max(1, minimum)) {
        throw new DomainError(
          "conflict",
          `${countNoun(minimum, unit)} are already packed, delivered or waiting on a decision, so this drive can't be smaller than ${minimum}.`,
          { fieldErrors: { quantity: `Choose ${Math.max(1, minimum)} or more` } },
        );
      }
    }

    await tx`update commitments set quantity = ${quantity} where id = ${commitment.id}`;
    await logActivity(tx, {
      kind: "drive.quantity_changed",
      audience: "both",
      actorId: userId,
      requestId: request.id,
      commitmentId: commitment.id,
      workspaceId: commitment.groupId,
      data: { from, to: quantity },
    });
    await assertInvariants(tx, request.id, commitment.id);
    return { commitmentId: commitment.id, quantity };
  });
}

// Withdrawing releases only what the group has not delivered: accepted units
// stay accepted, and units in a delivery awaiting review stay reserved until
// the organization decides on them.
export async function withdrawCommitment(ctx: ServiceContext, input: { commitmentId: string; note: string }) {
  return mutate(ctx, { action: "drive.withdraw" }, async (tx, userId) => {
    const state = await loadDriveState(tx, input.commitmentId, { lock: true });
    const { request, commitment } = state;
    await requireRole(tx, commitment.groupId, userId, "admin", "Only the group's coordinators can withdraw the drive.");
    if (commitment.status !== "active") throw new DomainError("conflict", "This drive was already withdrawn.");
    const note = (input.note ?? "").trim().slice(0, 1000);
    const { stages } = progressOf(state);
    const released = Math.max(0, commitment.quantity - stages.accepted - stages.pendingReview);

    await tx`
      update commitments
      set status = 'withdrawn', withdrawn_at = ${now(ctx)}, withdrawn_by = ${userId}, withdraw_note = ${note}
      where id = ${commitment.id}
    `;
    // Tell contributors they no longer need to bring what they promised.
    await tx`
      update pledges set status = 'closed', closed_reason = 'released', closed_by = ${userId}, closed_at = ${now(ctx)}
      where commitment_id = ${commitment.id} and status = 'open'
    `;
    await logActivity(tx, {
      kind: "drive.withdrawn",
      audience: "both",
      actorId: userId,
      requestId: request.id,
      commitmentId: commitment.id,
      workspaceId: commitment.groupId,
      data: { released, accepted: stages.accepted, pendingReview: stages.pendingReview, note },
    });
    await assertInvariants(tx, request.id, commitment.id);
    return { commitmentId: commitment.id, released, stillReserved: stages.pendingReview };
  });
}
