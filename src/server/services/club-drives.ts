// A club's own drive, for a recipient that isn't on KitGap, and the receipt
// link that recipient uses to confirm a delivery without an account.
//
// The recipient is stored as a workspace of kind 'recipient' with no members.
// Its request is the club's drive: published at once (there's nothing public
// for a reviewer to approve, because it's never listed) and adopted in full by
// the club in the same transaction. Every drive rule then applies unchanged.
//
// Only the recipient may confirm. Nobody is a member of a recipient workspace,
// so the organization review path can't be used; the receipt link is the only
// way, and a signed-in member of the club is refused even with the link. A
// receipt confirmation is labelled "Confirmed by recipient", a separate tier
// from a confirmation by a KitGap-verified organization.

import { createHash, randomBytes } from "node:crypto";
import { DomainError } from "@/domain/errors";
import { validateRequestInput, type ComponentInput } from "@/domain/request-input";
import { inSchema, type Tx } from "../db/client";
import {
  assertInvariants,
  isUuid,
  loadDriveState,
  logActivity,
  mutate,
  newId,
  now,
  requireRole,
  roleIn,
  type ServiceContext,
} from "./core";
import { parseQuantity } from "./drives";
import { requestColumns, writeComponents } from "./request-rows";
import { parseReviewDecision } from "./supplies";
import { insertWorkspace, newInviteToken, validateWorkspaceInput } from "./workspaces";

export interface ClubDriveInput {
  groupId?: string | null;
  newGroup?: { name: string; city: string } | null;
  recipientName: string;
  recipientCity: string;
  title: string;
  category: string;
  quantity: unknown;
  components: ComponentInput[];
  neededBy: string;
  timezone?: string;
  handoverInstructions?: string;
  idempotencyKey?: string;
}

function fieldErrors(errors: Record<string, string>): never {
  throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: errors });
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");

export async function createClubDrive(
  ctx: ServiceContext,
  input: ClubDriveInput,
): Promise<{ commitmentId: string; requestId: string; groupId: string }> {
  return mutate(ctx, { action: "club_drive.create", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const errors: Record<string, string> = {};
    const recipientName = text(input.recipientName, 120);
    const recipientCity = text(input.recipientCity, 120);
    if (recipientName.length < 2) errors.recipientName = "Enter who will receive the kits, like “Riverbend Family Center”";
    if (recipientCity.length < 2) errors.recipientCity = "Enter their city, like “Kissimmee, FL”";

    let quantity = 0;
    try {
      quantity = parseQuantity(input.quantity);
    } catch {
      errors.quantity = "Enter a whole number of kits, at least 1";
    }

    let groupName = "";
    if (input.groupId) {
      await requireRole(tx, input.groupId, userId, "admin", "Only a group's coordinators can start a drive for it.");
      const [group] = await tx`select kind, name from workspaces where id = ${input.groupId}`;
      if (group?.kind !== "group") fieldErrors({ groupId: "Choose a school club or community group" });
      groupName = group.name as string;
    } else if (input.newGroup) {
      const groupErrors = validateWorkspaceInput({ kind: "group", ...input.newGroup });
      for (const [k, v] of Object.entries(groupErrors)) errors[`group.${k}`] = v;
      groupName = text(input.newGroup.name, 120);
    } else {
      errors.groupId = "Choose the group running this drive";
    }

    // The same validation an organization's request goes through, so the
    // recipe, date and title follow the same rules.
    const { value, errors: requestErrors } = validateRequestInput(
      {
        title: input.title,
        need: `${groupName || "A club"} is collecting kits for ${recipientName || "a local organization"}.`,
        beneficiaries: `People served by ${recipientName || "the recipient"}`,
        category: input.category,
        requestType: "kit",
        unitName: "kit",
        targetQuantity: quantity || "",
        components: input.components,
        conditionNotes: "",
        substitutions: "",
        neededBy: input.neededBy,
        timezone: input.timezone ?? "America/New_York",
        location: recipientCity,
        handoverInstructions: input.handoverInstructions ?? "",
        coordinatorContact: "",
        fundraisingUrl: "",
      },
      "submit",
      now(ctx),
    );
    for (const [k, v] of Object.entries(requestErrors)) {
      if (k === "location") continue; // reported as recipientCity above
      if (k === "targetQuantity") continue; // reported as quantity above
      errors[k] = v;
    }
    if (Object.keys(errors).length > 0) fieldErrors(errors);

    let groupId = input.groupId ?? null;
    if (!groupId && input.newGroup) {
      groupId = (await insertWorkspace(tx, userId, { kind: "group", ...input.newGroup })).workspaceId;
    }

    // The recipient: a workspace nobody belongs to.
    const recipientId = newId();
    await tx`
      insert into workspaces ${tx({
        id: recipientId,
        kind: "recipient",
        name: recipientName,
        city: recipientCity,
        inviteToken: newInviteToken(),
        createdBy: userId,
      })}
    `;

    const at = now(ctx);
    const requestId = newId();
    await tx`
      insert into requests ${tx({
        id: requestId,
        orgId: recipientId,
        createdBy: userId,
        ...requestColumns(value),
        status: "published",
        submittedAt: at,
        publishedAt: at,
      })}
    `;
    await writeComponents(tx, requestId, value);

    const commitmentId = newId();
    await tx`insert into commitments ${tx({ id: commitmentId, requestId, groupId, quantity, createdBy: userId })}`;
    await logActivity(tx, {
      kind: "drive.started",
      audience: "group",
      actorId: userId,
      requestId,
      commitmentId,
      workspaceId: groupId,
      data: { quantity, ownDrive: true, recipient: recipientName },
    });
    await assertInvariants(tx, requestId, commitmentId);
    return { commitmentId, requestId, groupId: groupId! };
  });
}

// Receipt links ------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function validTokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{20,80}$/.test(token);
}

/** Whether a request belongs to a club's own drive (its recipient isn't on KitGap). */
export async function isRecipientRequest(tx: Tx, orgId: string): Promise<boolean> {
  const [row] = await tx`select kind from workspaces where id = ${orgId}`;
  return row?.kind === "recipient";
}

// A coordinator makes the link to give the recipient at handover. Making a
// new one replaces the old, so a link that went to the wrong person stops
// working. The link itself is returned once and never stored.
export async function issueReceiptLink(ctx: ServiceContext, input: { deliveryId: string }): Promise<{ token: string }> {
  return mutate(ctx, { action: "receipt.issue" }, async (tx, userId) => {
    if (!isUuid(input.deliveryId)) throw new DomainError("not_found", "That delivery doesn't exist.");
    const [delivery] = await tx`select * from deliveries where id = ${input.deliveryId}`;
    if (!delivery) throw new DomainError("not_found", "That delivery doesn't exist.");
    const state = await loadDriveState(tx, delivery.commitmentId as string, { lock: true });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can make a receipt link.");
    if (!(await isRecipientRequest(tx, state.request.orgId))) {
      throw new DomainError("not_allowed", "This organization is on KitGap and confirms deliveries from its own account.");
    }
    if (delivery.status !== "submitted") {
      throw new DomainError("conflict", "This delivery was already confirmed or taken back.");
    }
    const token = randomBytes(24).toString("base64url");
    await tx`
      update deliveries set receipt_token_hash = ${hashToken(token)}, receipt_issued_at = ${now(ctx)}
      where id = ${delivery.id}
    `;
    await logActivity(tx, {
      kind: "receipt.issued",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { deliveryId: delivery.id, quantity: delivery.quantity },
    });
    return { token };
  });
}

export interface ReceiptView {
  deliveryId: string;
  status: "submitted" | "cancelled" | "reviewed";
  quantity: number;
  unitName: string;
  title: string;
  note: string;
  groupName: string;
  groupCity: string;
  recipientName: string;
  components: { name: string; perKit: number; details: string }[];
  submittedAt: Date;
  timezone: string;
  accepted: number | null;
  notAccepted: number | null;
  reviewNote: string;
  signedName: string | null;
  reviewedAt: Date | null;
  // A signed-in member of the delivering club opened their own link.
  viewerIsClubMember: boolean;
}

export async function getReceipt(ctx: ServiceContext, token: string): Promise<ReceiptView | null> {
  if (!validTokenShape(token)) return null;
  return inSchema(ctx.sql, ctx.schema, async (tx) => {
    const [row] = await tx`
      select d.*, c.group_id, r.id as request_id, r.title, r.unit_name, r.timezone,
             g.name as group_name, g.city as group_city, o.name as recipient_name, o.kind as recipient_kind
      from deliveries d
      join commitments c on c.id = d.commitment_id
      join requests r on r.id = c.request_id
      join workspaces g on g.id = c.group_id
      join workspaces o on o.id = r.org_id
      where d.receipt_token_hash = ${hashToken(token)}
    `;
    if (!row || row.recipientKind !== "recipient") return null;
    const components = await tx`
      select name, quantity_per_unit, details from request_components where request_id = ${row.requestId} order by position
    `;
    return {
      deliveryId: row.id as string,
      status: row.status as ReceiptView["status"],
      quantity: row.quantity as number,
      unitName: row.unitName as string,
      title: row.title as string,
      note: row.note as string,
      groupName: row.groupName as string,
      groupCity: row.groupCity as string,
      recipientName: row.recipientName as string,
      components: components.map((c) => ({ name: c.name as string, perKit: c.quantityPerUnit as number, details: c.details as string })),
      submittedAt: row.submittedAt as Date,
      timezone: row.timezone as string,
      accepted: (row.acceptedQuantity as number | null) ?? null,
      notAccepted: (row.notAcceptedQuantity as number | null) ?? null,
      reviewNote: row.reviewNote as string,
      signedName: (row.receiptSignedName as string | null) ?? null,
      reviewedAt: (row.reviewedAt as Date | null) ?? null,
      viewerIsClubMember: Boolean(await roleIn(tx, row.groupId as string, ctx.userId)),
    };
  });
}

// The recipient's decision, through the link. No KitGap account is needed;
// the person types their name. Same rules as an organization's review.
export async function reviewDeliveryByReceipt(
  ctx: ServiceContext,
  input: { token: string; accepted: unknown; notAccepted?: unknown; note?: string; signedName: unknown },
): Promise<{ deliveryId: string; accepted: number; notAccepted: number }> {
  if (!validTokenShape(input.token)) throw new DomainError("not_found", "This receipt link isn't valid.");
  return inSchema(ctx.sql, ctx.schema, async (tx) => {
    const [found] = await tx`select id, commitment_id from deliveries where receipt_token_hash = ${hashToken(input.token)}`;
    if (!found) throw new DomainError("not_found", "This receipt link isn't valid. Ask the club for a new one.");
    const state = await loadDriveState(tx, found.commitmentId as string, { lock: true });
    if (!(await isRecipientRequest(tx, state.request.orgId))) {
      throw new DomainError("not_found", "This receipt link isn't valid.");
    }
    if (await roleIn(tx, state.commitment.groupId, ctx.userId)) {
      throw new DomainError(
        "not_allowed",
        "You're part of the club that made this delivery, so you can't confirm it. Give this link to the person receiving the kits.",
      );
    }
    const [delivery] = await tx`select * from deliveries where id = ${found.id}`;
    if (delivery.status !== "submitted") {
      throw new DomainError("conflict", "This delivery was already confirmed or taken back.");
    }
    const signedName = text(input.signedName, 120);
    if (signedName.length < 2) fieldErrors({ signedName: "Enter your name, like “Maya, front desk”" });
    const { accepted, notAccepted, note } = parseReviewDecision(delivery.quantity as number, input);

    const updated = await tx`
      update deliveries
      set status = 'reviewed', accepted_quantity = ${accepted}, not_accepted_quantity = ${notAccepted},
          review_note = ${note.slice(0, 1000)}, reviewed_at = ${now(ctx)},
          confirmed_via = 'receipt', receipt_signed_name = ${signedName}
      where id = ${delivery.id} and status = 'submitted'
      returning id
    `;
    if (updated.length === 0) throw new DomainError("conflict", "This delivery was already confirmed.");
    await logActivity(tx, {
      kind: "delivery.reviewed",
      audience: "both",
      actorId: null,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: {
        deliveryId: delivery.id,
        quantity: delivery.quantity,
        accepted,
        notAccepted,
        note: note.slice(0, 1000),
        via: "receipt",
        signedName,
      },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { deliveryId: delivery.id as string, accepted, notAccepted };
  });
}
