// Inside a drive: pledges, received supplies, packing kits, deliveries and the
// receiving organization's review. Each change is checked against the drive's
// current numbers (driveProgress) while the request row is locked.

import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import { driveInvariantViolations, driveProgress } from "@/domain/quantities";
import { countNoun, listPhrase, pluralize } from "@/domain/text";
import type { CollectionEntryRecord, KitMovementRecord } from "@/domain/types";
import type { Tx } from "../db/client";
import {
  assertInvariants,
  isUuid,
  loadDriveState,
  logActivity,
  mutate,
  newId,
  now,
  progressOf,
  requireRole,
  roleIn,
  type DriveState,
  type ServiceContext,
} from "./core";
import { parseQuantity, unitWord } from "./drives";

function invalid(field: string, message: string): never {
  throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: { [field]: message } });
}

function parseCount(value: unknown, field: string, { allowZero }: { allowZero: boolean }): number {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/,/g, "") : "";
  if (raw === "" && allowZero) return 0;
  if (!/^\d+$/.test(raw) || Number(raw) > 100_000) invalid(field, "Enter a whole number");
  const n = Number(raw);
  if (!allowZero && n < 1) invalid(field, "Enter a whole number of at least 1");
  return n;
}

function requireActiveDrive(state: DriveState, action: string) {
  if (state.commitment.status !== "active") {
    throw new DomainError("closed", `This drive was withdrawn, so you can't ${action}.`);
  }
  if (!acceptsDeliveries(state.request.status)) {
    throw new DomainError("closed", `The organization cancelled this request, so you can't ${action}.`);
  }
}

async function lockDrive(_ctx: ServiceContext, tx: Tx, commitmentId: string) {
  return loadDriveState(tx, commitmentId, { lock: true });
}

// Pledges --------------------------------------------------------------------

export async function createPledge(
  ctx: ServiceContext,
  input: { commitmentId: string; componentId: string; quantity: unknown; note?: string; idempotencyKey?: string },
) {
  return mutate(ctx, { action: "pledge.create", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await lockDrive(ctx, tx, input.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "member", "Join this group to pledge supplies.");
    requireActiveDrive(state, "pledge supplies");
    const component = state.components.find((c) => c.id === input.componentId);
    if (!component) invalid("componentId", "Choose an item from this drive's supply list");
    const quantity = parseQuantity(input.quantity);
    const progress = progressOf(state);
    const line = progress.components.find((c) => c.componentId === component.id)!;
    if (quantity > line.uncovered) {
      throw new DomainError(
        "conflict",
        line.uncovered === 0
          ? `No more ${pluralize(component.name).toLowerCase()} are needed right now. Thank you!`
          : `Only ${countNoun(line.uncovered, component.name)} still ${line.uncovered === 1 ? "needs" : "need"} a pledge.`,
        { fieldErrors: { quantity: `Choose ${line.uncovered} or fewer` }, details: { uncovered: line.uncovered } },
      );
    }
    const pledgeId = newId();
    await tx`
      insert into pledges ${tx({
        id: pledgeId,
        commitmentId: state.commitment.id,
        componentId: component.id,
        userId,
        quantity,
        note: (input.note ?? "").trim().slice(0, 300),
      })}
    `;
    await logActivity(tx, {
      kind: "pledge.created",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { component: component.name, quantity },
    });
    return { pledgeId };
  });
}

// The contributor withdraws their own pledge, or a coordinator releases one
// that isn't coming. Anything already received stays recorded.
export async function closePledge(ctx: ServiceContext, input: { pledgeId: string }) {
  return mutate(ctx, { action: "pledge.close" }, async (tx, userId) => {
    if (!isUuid(input.pledgeId)) throw new DomainError("not_found", "That pledge doesn't exist.");
    const [pledge] = await tx`select * from pledges where id = ${input.pledgeId}`;
    if (!pledge) throw new DomainError("not_found", "That pledge doesn't exist.");
    const state = await lockDrive(ctx, tx, pledge.commitmentId);
    const isOwner = pledge.userId === userId;
    if (!isOwner) {
      await requireRole(tx, state.commitment.groupId, userId, "admin", "You can only withdraw your own pledges.");
    }
    if (pledge.status !== "open") throw new DomainError("conflict", "This pledge is already closed.");
    const reason = isOwner ? "withdrawn" : "released";
    await tx`
      update pledges set status = 'closed', closed_reason = ${reason}, closed_by = ${userId}, closed_at = ${now(ctx)}
      where id = ${pledge.id}
    `;
    const component = state.components.find((c) => c.id === pledge.componentId)!;
    await logActivity(tx, {
      kind: isOwner ? "pledge.withdrawn" : "pledge.released",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { component: component.name, outstanding: progressOf(state).pledgeOutstanding.get(pledge.id) ?? 0 },
    });
    return { pledgeId: pledge.id };
  });
}

// Received supplies -----------------------------------------------------------

export async function recordCollection(
  ctx: ServiceContext,
  input: {
    commitmentId: string;
    componentId: string;
    usable: unknown;
    unusable?: unknown;
    pledgeId?: string | null;
    closeRestOfPledge?: boolean;
    note?: string;
    idempotencyKey?: string;
  },
) {
  return mutate(ctx, { action: "collection.record", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await lockDrive(ctx, tx, input.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only coordinators can record received supplies.");
    requireActiveDrive(state, "record supplies");
    const usable = parseCount(input.usable, "usable", { allowZero: true });
    const unusable = parseCount(input.unusable ?? "", "unusable", { allowZero: true });
    if (usable + unusable < 1) invalid("usable", "Enter how many arrived");

    let pledge: (typeof state.pledges)[number] | undefined;
    if (input.pledgeId) {
      pledge = state.pledges.find((p) => p.id === input.pledgeId);
      if (!pledge || pledge.status !== "open") {
        throw new DomainError("conflict", "That pledge is no longer open. Reload to see the current pledges.");
      }
    }
    const componentId = pledge ? pledge.componentId : input.componentId;
    const component = state.components.find((c) => c.id === componentId);
    if (!component) invalid("componentId", "Choose an item from this drive's supply list");

    const progress = progressOf(state);
    if (pledge) {
      const outstanding = progress.pledgeOutstanding.get(pledge.id) ?? 0;
      if (usable + unusable > outstanding) {
        throw new DomainError(
          "invalid_input",
          `This pledge has ${countNoun(outstanding, component.name)} still to come. Record anything extra as a separate donation.`,
          { fieldErrors: { usable: `Enter ${outstanding} or fewer in total` } },
        );
      }
    }

    const entryId = newId();
    await tx`
      insert into collection_entries ${tx({
        id: entryId,
        commitmentId: state.commitment.id,
        componentId: component.id,
        pledgeId: pledge?.id ?? null,
        usableQuantity: usable,
        unusableQuantity: unusable,
        note: (input.note ?? "").trim().slice(0, 300),
        recordedBy: userId,
      })}
    `;
    if (pledge && input.closeRestOfPledge) {
      const outstanding = (progress.pledgeOutstanding.get(pledge.id) ?? 0) - usable - unusable;
      if (outstanding > 0) {
        await tx`
          update pledges set status = 'closed', closed_reason = 'released', closed_by = ${userId}, closed_at = ${now(ctx)}
          where id = ${pledge.id}
        `;
      }
    }
    await logActivity(tx, {
      kind: "collection.recorded",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { component: component.name, usable, unusable, pledged: Boolean(pledge) },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { entryId };
  });
}

// Removes a mistaken entry from the totals. The entry stays in the history.
export async function voidCollection(ctx: ServiceContext, input: { entryId: string; reason: string }) {
  return mutate(ctx, { action: "collection.void" }, async (tx, userId) => {
    if (!isUuid(input.entryId)) throw new DomainError("not_found", "That entry doesn't exist.");
    const [entry] = await tx`select * from collection_entries where id = ${input.entryId}`;
    if (!entry) throw new DomainError("not_found", "That entry doesn't exist.");
    const state = await lockDrive(ctx, tx, entry.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only coordinators can correct received supplies.");
    if (entry.voidedAt) throw new DomainError("conflict", "This entry was already removed.");
    const reason = (input.reason ?? "").trim();
    if (reason.length < 3) invalid("reason", "Say why this entry is being removed");

    const without = driveProgress({
      requestType: state.request.requestType,
      components: state.components,
      commitment: state.commitment,
      pledges: state.pledges,
      collections: state.collections.map((c) => (c.id === entry.id ? { ...c, voidedAt: now(ctx) } : c)) as CollectionEntryRecord[],
      movements: state.movements,
      deliveries: state.driveDeliveries,
    });
    if (driveInvariantViolations(without).length > 0) {
      throw new DomainError(
        "conflict",
        state.request.requestType === "kit"
          ? "These supplies are already packed into kits. Unpack kits first, then remove this entry."
          : "These items were already handed over. Removing the entry would make the totals impossible.",
      );
    }
    await tx`
      update collection_entries set voided_at = ${now(ctx)}, voided_by = ${userId}, void_reason = ${reason.slice(0, 300)}
      where id = ${entry.id}
    `;
    const component = state.components.find((c) => c.id === entry.componentId)!;
    await logActivity(tx, {
      kind: "collection.voided",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { component: component.name, usable: entry.usableQuantity, unusable: entry.unusableQuantity, reason },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { entryId: entry.id };
  });
}

// Kit movements ----------------------------------------------------------------

export async function moveKits(
  ctx: ServiceContext,
  input: { commitmentId: string; kind: KitMovementRecord["kind"]; quantity: unknown; note?: string; idempotencyKey?: string },
) {
  return mutate(ctx, { action: `kits.${input.kind}`, idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await lockDrive(ctx, tx, input.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only coordinators can update kits.");
    const quantity = parseQuantity(input.quantity);
    const progress = progressOf(state);
    const { stages } = progress;
    const unit = unitWord(state.request);
    const isKit = state.request.requestType === "kit";

    switch (input.kind) {
      case "packed": {
        if (!isKit) throw new DomainError("invalid_input", "Single-item drives don't need packing.");
        requireActiveDrive(state, "pack kits");
        if (quantity > stages.toBuild) {
          throw new DomainError("invalid_input", `Only ${countNoun(stages.toBuild, unit)} still need packing for this drive.`, {
            fieldErrors: { quantity: `Choose ${stages.toBuild} or fewer` },
          });
        }
        if (quantity > progress.packableNow) {
          const short = progress.components
            .filter((c) => c.unallocated < c.quantityPerUnit * quantity)
            .map((c) => countNoun(c.quantityPerUnit * quantity - c.unallocated, c.name));
          throw new DomainError(
            "invalid_input",
            `The supplies on hand make ${countNoun(progress.packableNow, unit)}. To pack ${quantity} you would need ${listPhrase(short)} more.`,
            { fieldErrors: { quantity: `Choose ${progress.packableNow} or fewer` } },
          );
        }
        break;
      }
      case "unpacked": {
        if (!isKit) throw new DomainError("invalid_input", "Single-item drives don't need packing.");
        if (quantity > stages.ready) {
          throw new DomainError("invalid_input", `Only ${countNoun(stages.ready, unit)} are packed and not yet handed over.`, {
            fieldErrors: { quantity: `Choose ${stages.ready} or fewer` },
          });
        }
        break;
      }
      case "repaired":
      case "set_aside": {
        if (input.kind === "repaired") requireActiveDrive(state, "return units to the ready pile");
        if (quantity > stages.needsFollowUp) {
          throw new DomainError("invalid_input", `Only ${countNoun(stages.needsFollowUp, unit)} are waiting for follow-up.`, {
            fieldErrors: { quantity: `Choose ${stages.needsFollowUp} or fewer` },
          });
        }
        break;
      }
      default:
        throw new DomainError("invalid_input", "Unknown kit action.");
    }

    await tx`
      insert into kit_movements ${tx({
        id: newId(),
        commitmentId: state.commitment.id,
        kind: input.kind,
        quantity,
        note: (input.note ?? "").trim().slice(0, 300),
        createdBy: userId,
      })}
    `;
    await logActivity(tx, {
      kind: `kits.${input.kind}`,
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { quantity, note: (input.note ?? "").trim().slice(0, 300) },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { ok: true };
  });
}

// Deliveries -------------------------------------------------------------------

export async function submitDelivery(
  ctx: ServiceContext,
  input: { commitmentId: string; quantity: unknown; note?: string; idempotencyKey?: string },
) {
  return mutate(ctx, { action: "delivery.submit", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const state = await lockDrive(ctx, tx, input.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only coordinators can report a delivery.");
    requireActiveDrive(state, "report a delivery");
    const quantity = parseQuantity(input.quantity);
    const progress = progressOf(state);
    const unit = unitWord(state.request);
    if (quantity > progress.deliverableNow) {
      const reason =
        state.request.requestType === "kit"
          ? `${countNoun(progress.deliverableNow, unit)} ${progress.deliverableNow === 1 ? "is" : "are"} packed and ready to hand over.`
          : `${countNoun(progress.deliverableNow, unit)} ${progress.deliverableNow === 1 ? "is" : "are"} collected and ready to hand over.`;
      throw new DomainError("invalid_input", reason, {
        fieldErrors: { quantity: `Choose ${progress.deliverableNow} or fewer` },
      });
    }
    const deliveryId = newId();
    await tx`
      insert into deliveries ${tx({
        id: deliveryId,
        commitmentId: state.commitment.id,
        quantity,
        note: (input.note ?? "").trim().slice(0, 1000),
        submittedBy: userId,
      })}
    `;
    await logActivity(tx, {
      kind: "delivery.submitted",
      audience: "both",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { quantity, deliveryId },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { deliveryId };
  });
}

// The group takes back a delivery report before the organization reviews it
// (for example, the wrong number was entered). The units return to "ready".
export async function cancelDelivery(ctx: ServiceContext, input: { deliveryId: string }) {
  return mutate(ctx, { action: "delivery.cancel" }, async (tx, userId) => {
    if (!isUuid(input.deliveryId)) throw new DomainError("not_found", "That delivery doesn't exist.");
    const [delivery] = await tx`select * from deliveries where id = ${input.deliveryId}`;
    if (!delivery) throw new DomainError("not_found", "That delivery doesn't exist.");
    const state = await lockDrive(ctx, tx, delivery.commitmentId);
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only coordinators can change a delivery report.");
    const updated = await tx`
      update deliveries set status = 'cancelled', cancelled_by = ${userId}, cancelled_at = ${now(ctx)}
      where id = ${delivery.id} and status = 'submitted'
      returning id
    `;
    if (updated.length === 0) {
      throw new DomainError("conflict", "The organization already reviewed this delivery, so it can't be taken back.");
    }
    await logActivity(tx, {
      kind: "delivery.cancelled",
      audience: "both",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { quantity: delivery.quantity, deliveryId: delivery.id },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { deliveryId: delivery.id };
  });
}

// The receiving organization's decision on a delivery. Each delivery is
// decided exactly once (the update only matches a "submitted" delivery), and
// every unit is either accepted or not accepted with an explanation.
export async function reviewDelivery(
  ctx: ServiceContext,
  input: { deliveryId: string; accepted: unknown; notAccepted?: unknown; note?: string; idempotencyKey?: string },
) {
  return mutate(ctx, { action: "delivery.review", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    if (!isUuid(input.deliveryId)) throw new DomainError("not_found", "That delivery doesn't exist.");
    const [delivery] = await tx`select * from deliveries where id = ${input.deliveryId}`;
    if (!delivery) throw new DomainError("not_found", "That delivery doesn't exist.");
    const state = await lockDrive(ctx, tx, delivery.commitmentId);
    const orgRole = await roleIn(tx, state.request.orgId, userId);
    if (!orgRole) {
      throw new DomainError("not_allowed", "Only the receiving organization can confirm what it received.");
    }
    if (delivery.submittedBy === userId) {
      throw new DomainError(
        "not_allowed",
        "You reported this delivery, so someone else at the receiving organization needs to confirm it.",
      );
    }
    if (delivery.status !== "submitted") {
      throw new DomainError("conflict", "This delivery was already reviewed or taken back. Reload to see its current state.");
    }
    const accepted = parseCount(input.accepted, "accepted", { allowZero: true });
    const notAccepted =
      input.notAccepted === undefined || input.notAccepted === ""
        ? delivery.quantity - accepted
        : parseCount(input.notAccepted, "notAccepted", { allowZero: true });
    if (accepted > delivery.quantity) invalid("accepted", `This delivery reported ${delivery.quantity}. Enter ${delivery.quantity} or fewer.`);
    if (accepted + notAccepted !== delivery.quantity) {
      invalid("notAccepted", `Accepted and not accepted must add up to the ${delivery.quantity} delivered`);
    }
    const note = (input.note ?? "").trim();
    if (notAccepted > 0 && note.length < 5) {
      invalid("note", "Explain what was wrong or missing so the group can fix it");
    }
    const updated = await tx`
      update deliveries
      set status = 'reviewed', accepted_quantity = ${accepted}, not_accepted_quantity = ${notAccepted},
          review_note = ${note.slice(0, 1000)}, reviewed_by = ${userId}, reviewed_at = ${now(ctx)}
      where id = ${delivery.id} and status = 'submitted'
      returning id
    `;
    if (updated.length === 0) {
      throw new DomainError("conflict", "This delivery was already reviewed. Reload to see the decision.");
    }
    await logActivity(tx, {
      kind: "delivery.reviewed",
      audience: "both",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.request.orgId,
      data: { deliveryId: delivery.id, quantity: delivery.quantity, accepted, notAccepted, note: note.slice(0, 1000) },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { deliveryId: delivery.id, accepted, notAccepted };
  });
}
