// Profiles, organizations, groups and memberships.

import { randomBytes } from "node:crypto";
import { DomainError } from "@/domain/errors";
import type { Tx } from "../db/client";
import { isUuid, logActivity, mutate, newId, now, requirePlatformAdmin, requireRole, type ServiceContext } from "./core";

export type WorkspaceKind = "organization" | "group";

export function newInviteToken(): string {
  return randomBytes(18).toString("base64url");
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Called after sign-in: makes sure the person has a profile row.
export async function ensureProfile(tx: Tx, userId: string, fallbackName: string): Promise<void> {
  const name = clean(fallbackName, 80) || "KitGap member";
  await tx`insert into profiles (id, display_name) values (${userId}, ${name}) on conflict (id) do nothing`;
}

export async function updateDisplayName(ctx: ServiceContext, input: { displayName: string }) {
  return mutate(ctx, { action: "profile.update" }, async (tx, userId) => {
    const displayName = clean(input.displayName, 200);
    if (displayName.length < 1) {
      throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: { displayName: "Enter your name" } });
    }
    if (displayName.length > 80) {
      throw new DomainError("invalid_input", "Some answers need attention.", {
        fieldErrors: { displayName: "Keep your name to 80 characters or fewer" },
      });
    }
    await tx`update profiles set display_name = ${displayName} where id = ${userId}`;
    return { ok: true };
  });
}

export interface WorkspaceInput {
  kind: WorkspaceKind;
  name: string;
  city: string;
  about?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function validateWorkspaceInput(input: WorkspaceInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = clean(input.name, 500);
  const city = clean(input.city, 500);
  if (name.length < 2) errors.name = input.kind === "group" ? "Enter your group's name" : "Enter your organization's name";
  else if (name.length > 120) errors.name = "Keep the name to 120 characters or fewer";
  if (city.length < 2) errors.city = "Enter a city or region, like “Kissimmee, FL”";
  else if (city.length > 120) errors.city = "Keep this to 120 characters or fewer";
  if (clean(input.about, 5000).length > 1000) errors.about = "Keep this to 1,000 characters or fewer";
  if (input.kind === "organization") {
    const contactName = clean(input.contactName, 500);
    const contactEmail = clean(input.contactEmail, 500);
    const contactPhone = clean(input.contactPhone, 500);
    if (contactName.length < 2) errors.contactName = "Enter the name of the person KitGap can contact";
    else if (contactName.length > 120) errors.contactName = "Keep this to 120 characters or fewer";
    if (!contactEmail && !contactPhone) {
      errors.contactEmail = "Enter an email address or phone number so a reviewer can confirm your organization";
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.contactEmail = "Enter an email address like name@school.org";
    } else if (contactEmail.length > 200) errors.contactEmail = "Keep this to 200 characters or fewer";
    if (contactPhone && !/^[0-9+().\-\s]{7,40}$/.test(contactPhone)) {
      errors.contactPhone = "Enter a phone number using digits, spaces, dashes or parentheses";
    }
  }
  return errors;
}

export async function createWorkspace(
  ctx: ServiceContext,
  input: WorkspaceInput & { idempotencyKey?: string },
): Promise<{ workspaceId: string }> {
  return mutate(ctx, { action: `workspace.create.${input.kind}`, idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    if (input.kind !== "organization" && input.kind !== "group") {
      throw new DomainError("invalid_input", "Choose an organization or a group.");
    }
    const errors = validateWorkspaceInput(input);
    if (Object.keys(errors).length > 0) {
      throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: errors });
    }
    return insertWorkspace(tx, userId, input);
  });
}

// Shared by createWorkspace and the "start a drive" flow, which can create a
// minimal group inside the same transaction as the commitment.
export async function insertWorkspace(tx: Tx, userId: string, input: WorkspaceInput): Promise<{ workspaceId: string }> {
  const workspaceId = newId();
  const isOrg = input.kind === "organization";
  await tx`
    insert into workspaces ${tx({
      id: workspaceId,
      kind: input.kind,
      name: clean(input.name, 120),
      city: clean(input.city, 120),
      about: clean(input.about, 1000),
      contactName: isOrg ? clean(input.contactName, 120) : "",
      contactEmail: isOrg ? clean(input.contactEmail, 200) : "",
      contactPhone: isOrg ? clean(input.contactPhone, 40) : "",
      inviteToken: newInviteToken(),
      createdBy: userId,
    })}
  `;
  await tx`insert into workspace_members (workspace_id, user_id, role) values (${workspaceId}, ${userId}, 'admin')`;
  await logActivity(tx, {
    kind: "workspace.created",
    audience: isOrg ? "org" : "group",
    actorId: userId,
    workspaceId,
  });
  return { workspaceId };
}

export async function updateWorkspace(ctx: ServiceContext, input: WorkspaceInput & { workspaceId: string }) {
  return mutate(ctx, { action: "workspace.update" }, async (tx, userId) => {
    await requireRole(tx, input.workspaceId, userId, "admin", "Only coordinators and managers can edit these details.");
    const [workspace] = await tx`select kind, contact_name, contact_email, contact_phone from workspaces where id = ${input.workspaceId}`;
    const kind = workspace.kind as WorkspaceKind;
    const errors = validateWorkspaceInput({ ...input, kind });
    if (Object.keys(errors).length > 0) {
      throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: errors });
    }
    const contactChanged =
      kind === "organization" &&
      (workspace.contactName !== clean(input.contactName, 120) ||
        workspace.contactEmail !== clean(input.contactEmail, 200) ||
        workspace.contactPhone !== clean(input.contactPhone, 40));
    await tx`
      update workspaces set ${tx({
        name: clean(input.name, 120),
        city: clean(input.city, 120),
        about: clean(input.about, 1000),
        ...(kind === "organization"
          ? {
              contactName: clean(input.contactName, 120),
              contactEmail: clean(input.contactEmail, 200),
              contactPhone: clean(input.contactPhone, 40),
            }
          : {}),
        // A confirmation applies to the contact that was checked, not a new one.
        ...(contactChanged ? { contactConfirmedAt: null, contactConfirmedBy: null } : {}),
      })}
      where id = ${input.workspaceId}
    `;
    return { workspaceId: input.workspaceId, contactChanged };
  });
}

export async function joinWorkspace(ctx: ServiceContext, input: { token: string }) {
  return mutate(ctx, { action: "workspace.join" }, async (tx, userId) => {
    const token = clean(input.token, 100);
    const [workspace] = token ? await tx`select id, kind, name from workspaces where invite_token = ${token}` : [];
    if (!workspace) {
      throw new DomainError("not_found", "This invitation link isn't valid any more. Ask for a new link.");
    }
    const inserted = await tx`
      insert into workspace_members (workspace_id, user_id, role)
      values (${workspace.id}, ${userId}, 'member')
      on conflict (workspace_id, user_id) do nothing
      returning user_id
    `;
    if (inserted.length > 0) {
      await logActivity(tx, {
        kind: "member.joined",
        audience: workspace.kind === "organization" ? "org" : "group",
        actorId: userId,
        workspaceId: workspace.id,
      });
    }
    return { workspaceId: workspace.id as string, kind: workspace.kind as WorkspaceKind, alreadyMember: inserted.length === 0 };
  });
}

export async function rotateInviteToken(ctx: ServiceContext, input: { workspaceId: string }) {
  return mutate(ctx, { action: "workspace.rotate_invite" }, async (tx, userId) => {
    await requireRole(tx, input.workspaceId, userId, "admin", "Only coordinators and managers can change the invitation link.");
    const token = newInviteToken();
    await tx`update workspaces set invite_token = ${token} where id = ${input.workspaceId}`;
    return { ok: true };
  });
}

export async function setMemberRole(
  ctx: ServiceContext,
  input: { workspaceId: string; memberId: string; role: "admin" | "member" | "remove" },
) {
  return mutate(ctx, { action: "workspace.member_role" }, async (tx, userId) => {
    await requireRole(tx, input.workspaceId, userId, "admin", "Only coordinators and managers can change members.");
    if (!isUuid(input.memberId)) throw new DomainError("not_found", "That person isn't a member.");
    const admins = await tx`select user_id from workspace_members where workspace_id = ${input.workspaceId} and role = 'admin' for update`;
    const isLastAdmin = admins.length === 1 && admins[0].userId === input.memberId;
    if (isLastAdmin && input.role !== "admin") {
      throw new DomainError("conflict", "Add another coordinator or manager before changing the last one.");
    }
    if (input.role === "remove") {
      await tx`delete from workspace_members where workspace_id = ${input.workspaceId} and user_id = ${input.memberId}`;
    } else {
      await tx`update workspace_members set role = ${input.role} where workspace_id = ${input.workspaceId} and user_id = ${input.memberId}`;
    }
    return { ok: true };
  });
}

// KitGap reviewers confirm that an organization's contact is real. This is the
// only thing the "Contact confirmed" label means.
export async function setContactConfirmed(ctx: ServiceContext, input: { workspaceId: string; confirmed: boolean }) {
  return mutate(ctx, { action: "workspace.confirm_contact" }, async (tx, userId) => {
    await requirePlatformAdmin(tx, userId);
    if (!isUuid(input.workspaceId)) throw new DomainError("not_found", "That organization doesn't exist.");
    const [workspace] = await tx`select kind from workspaces where id = ${input.workspaceId}`;
    if (workspace?.kind !== "organization") throw new DomainError("not_found", "That organization doesn't exist.");
    await tx`
      update workspaces
      set contact_confirmed_at = ${input.confirmed ? now(ctx) : null},
          contact_confirmed_by = ${input.confirmed ? userId : null}
      where id = ${input.workspaceId}
    `;
    await logActivity(tx, {
      kind: input.confirmed ? "workspace.contact_confirmed" : "workspace.contact_unconfirmed",
      audience: "org",
      actorId: userId,
      workspaceId: input.workspaceId,
    });
    return { ok: true };
  });
}
