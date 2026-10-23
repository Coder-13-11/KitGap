// Read models for the receiving organization's workspace, the delivery review
// page and the KitGap reviewer queue.

import { describeDeadline, type DeadlineInfo } from "@/domain/dates";
import { requestPhase, type RequestPhase } from "@/domain/phase";
import { driveProgress, requestTotals, supplyList, type RequestTotals, type SupplyLine, type UnitStages } from "@/domain/quantities";
import type {
  CollectionEntryRecord,
  CommitmentRecord,
  ComponentRecord,
  DeliveryRecord,
  KitMovementRecord,
  RequestRecord,
} from "@/domain/types";
import { isPlatformAdmin, isUuid, now, read, roleIn, type ServiceContext } from "../services/core";
import { activityFor, type ActivityItem } from "./activity";

export interface OrgWorkspaceInfo {
  id: string;
  name: string;
  city: string;
  about: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactConfirmedAt: Date | null;
  inviteToken: string | null; // managers only
}

export interface PendingDeliveryItem {
  deliveryId: string;
  quantity: number;
  note: string;
  submittedAt: Date;
  groupName: string;
  requestId: string;
  requestTitle: string;
  unitName: string;
  commitmentId: string;
}

export interface OrgRequestItem {
  id: string;
  title: string;
  status: RequestRecord["status"];
  phase: RequestPhase;
  totals: RequestTotals | null;
  unitName: string;
  neededBy: string | null;
  deadline: DeadlineInfo | null;
  statusNote: string;
  updatedAt: Date;
}

export interface OrgDriveItem {
  commitmentId: string;
  groupName: string;
  requestId: string;
  requestTitle: string;
  unitName: string;
  quantity: number;
  status: CommitmentRecord["status"];
  stages: UnitStages;
  neededBy: string;
  deadline: DeadlineInfo;
}

export interface OrgDashboard {
  org: OrgWorkspaceInfo;
  role: "admin" | "member";
  pendingDeliveries: PendingDeliveryItem[];
  requests: OrgRequestItem[];
  drives: OrgDriveItem[];
  members: { userId: string; name: string; role: "admin" | "member" }[];
  activity: ActivityItem[];
}

export async function getOrgDashboard(ctx: ServiceContext, orgId: string): Promise<OrgDashboard | "not_allowed" | null> {
  if (!isUuid(orgId)) return null;
  const at = now(ctx);
  return read(ctx, async (tx) => {
    const [org] = await tx`select * from workspaces where id = ${orgId} and kind = 'organization'`;
    if (!org) return null;
    const role = await roleIn(tx, orgId, ctx.userId);
    if (!role) return "not_allowed";

    const requests = (await tx`
      select * from requests where org_id = ${orgId} order by created_at desc
    `) as unknown as RequestRecord[];
    const ids = requests.map((r) => r.id);
    const components = (await tx`
      select * from request_components where request_id = any(${ids}::uuid[])
    `) as unknown as ComponentRecord[];
    const commitments = (await tx`
      select * from commitments where request_id = any(${ids}::uuid[]) order by created_at
    `) as unknown as CommitmentRecord[];
    const commitmentIds = commitments.map((c) => c.id);
    const deliveries = (await tx`
      select * from deliveries where commitment_id = any(${commitmentIds}::uuid[]) order by submitted_at
    `) as unknown as DeliveryRecord[];
    const collections = (await tx`
      select * from collection_entries where commitment_id = any(${commitmentIds}::uuid[])
    `) as unknown as CollectionEntryRecord[];
    const movements = (await tx`
      select * from kit_movements where commitment_id = any(${commitmentIds}::uuid[])
    `) as unknown as KitMovementRecord[];
    const groupRows = await tx`select id, name from workspaces where id = any(${commitments.map((c) => c.groupId)}::uuid[])`;
    const groupName = new Map(groupRows.map((g) => [g.id as string, g.name as string]));
    const byId = new Map(requests.map((r) => [r.id, r]));

    const requestItems: OrgRequestItem[] = requests.map((r) => {
      const cs = commitments.filter((c) => c.requestId === r.id);
      const ds = deliveries.filter((d) => cs.some((c) => c.id === d.commitmentId));
      const totals = r.targetQuantity ? requestTotals(r.targetQuantity, cs, ds) : null;
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        phase: requestPhase(r, totals ?? { accepted: 0, available: 0, target: 1 }, at),
        totals,
        unitName: r.unitName,
        neededBy: r.neededBy,
        deadline: r.neededBy ? describeDeadline(r.neededBy, r.timezone, at) : null,
        statusNote: r.statusNote,
        updatedAt: r.updatedAt,
      };
    });

    const pendingDeliveries: PendingDeliveryItem[] = deliveries
      .filter((d) => d.status === "submitted")
      .map((d) => {
        const c = commitments.find((x) => x.id === d.commitmentId)!;
        const r = byId.get(c.requestId)!;
        return {
          deliveryId: d.id,
          quantity: d.quantity,
          note: d.note,
          submittedAt: d.submittedAt,
          groupName: groupName.get(c.groupId) ?? "A group",
          requestId: r.id,
          requestTitle: r.title,
          unitName: r.unitName,
          commitmentId: c.id,
        };
      });

    const drives: OrgDriveItem[] = commitments
      .filter((c) => c.status === "active" || deliveries.some((d) => d.commitmentId === c.id && d.status === "submitted"))
      .map((c) => {
        const r = byId.get(c.requestId)!;
        const progress = driveProgress({
          requestType: r.requestType,
          components: components.filter((x) => x.requestId === r.id),
          commitment: c,
          pledges: [],
          collections: collections.filter((x) => x.commitmentId === c.id),
          movements: movements.filter((x) => x.commitmentId === c.id),
          deliveries: deliveries.filter((x) => x.commitmentId === c.id),
        });
        return {
          commitmentId: c.id,
          groupName: groupName.get(c.groupId) ?? "A group",
          requestId: r.id,
          requestTitle: r.title,
          unitName: r.unitName,
          quantity: c.quantity,
          status: c.status,
          stages: progress.stages,
          neededBy: r.neededBy ?? "",
          deadline: describeDeadline(r.neededBy ?? "2000-01-01", r.timezone, at),
        };
      })
      .sort((a, b) => a.neededBy.localeCompare(b.neededBy));

    const members = await tx`
      select m.user_id, p.display_name as name, m.role from workspace_members m join profiles p on p.id = m.user_id
      where m.workspace_id = ${orgId} order by m.role, p.display_name
    `;

    const activity = await activityFor(tx, {
      requestIds: ids,
      audiences: ["org", "both"],
      showNames: true,
      viewerId: ctx.userId,
      limit: 25,
    });

    return {
      org: {
        id: org.id,
        name: org.name,
        city: org.city,
        about: org.about,
        contactName: org.contactName,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        contactConfirmedAt: org.contactConfirmedAt,
        inviteToken: role === "admin" ? org.inviteToken : null,
      },
      role,
      pendingDeliveries,
      requests: requestItems,
      drives,
      members: members.map((m) => ({ userId: m.userId as string, name: m.name as string, role: m.role as "admin" | "member" })),
      activity,
    };
  });
}

// ---------------------------------------------------------------------------

export interface DeliveryForReview {
  delivery: DeliveryRecord;
  orgId: string;
  orgName: string;
  groupName: string;
  request: Pick<RequestRecord, "id" | "title" | "requestType" | "unitName" | "conditionNotes" | "substitutions">;
  supply: SupplyLine[]; // recipe for one unit, to check against
  drive: { commitmentId: string; quantity: number; accepted: number; pendingReview: number; status: CommitmentRecord["status"] };
  submittedByName: string;
  submittedByViewer: boolean;
  reviewedByName: string | null;
}

export async function getDeliveryForReview(
  ctx: ServiceContext,
  deliveryId: string,
): Promise<DeliveryForReview | "not_allowed" | null> {
  if (!isUuid(deliveryId)) return null;
  return read(ctx, async (tx) => {
    const [delivery] = (await tx`select * from deliveries where id = ${deliveryId}`) as unknown as DeliveryRecord[];
    if (!delivery) return null;
    const [commitment] = (await tx`select * from commitments where id = ${delivery.commitmentId}`) as unknown as CommitmentRecord[];
    const [request] = (await tx`select * from requests where id = ${commitment.requestId}`) as unknown as RequestRecord[];
    const role = await roleIn(tx, request.orgId, ctx.userId);
    if (!role) return ctx.userId ? "not_allowed" : null;
    const [org] = await tx`select name from workspaces where id = ${request.orgId}`;
    const [group] = await tx`select name from workspaces where id = ${commitment.groupId}`;
    const components = (await tx`
      select * from request_components where request_id = ${request.id} order by position
    `) as unknown as ComponentRecord[];
    const driveDeliveries = (await tx`
      select * from deliveries where commitment_id = ${commitment.id}
    `) as unknown as DeliveryRecord[];
    const totals = requestTotals(commitment.quantity, [commitment], driveDeliveries);
    const [submitter] = await tx`select display_name from profiles where id = ${delivery.submittedBy}`;
    const [reviewer] = delivery.reviewedAt
      ? await tx`select p.display_name from deliveries d join profiles p on p.id = d.reviewed_by where d.id = ${delivery.id}`
      : [];
    return {
      delivery,
      orgId: request.orgId,
      orgName: org.name,
      groupName: group.name,
      request: {
        id: request.id,
        title: request.title,
        requestType: request.requestType,
        unitName: request.unitName,
        conditionNotes: request.conditionNotes,
        substitutions: request.substitutions,
      },
      supply: supplyList(components, 1),
      drive: {
        commitmentId: commitment.id,
        quantity: commitment.quantity,
        accepted: totals.accepted,
        pendingReview: totals.pendingReview,
        status: commitment.status,
      },
      submittedByName: submitter?.displayName ?? "A coordinator",
      submittedByViewer: delivery.submittedBy === ctx.userId,
      reviewedByName: reviewer?.displayName ?? null,
    };
  });
}

// ---------------------------------------------------------------------------

export interface ReviewQueue {
  requests: {
    id: string;
    title: string;
    orgId: string;
    orgName: string;
    orgContact: { name: string; email: string; phone: string; confirmedAt: Date | null };
    submittedAt: Date | null;
    targetQuantity: number;
    unitName: string;
    neededBy: string | null;
  }[];
  organizations: {
    id: string;
    name: string;
    city: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactConfirmedAt: Date | null;
    createdAt: Date;
  }[];
}

export async function getReviewQueue(ctx: ServiceContext): Promise<ReviewQueue | "not_allowed"> {
  return read(ctx, async (tx) => {
    if (!(await isPlatformAdmin(tx, ctx.userId))) return "not_allowed";
    const requests = await tx`
      select r.id, r.title, r.org_id, r.submitted_at, r.target_quantity, r.unit_name, r.needed_by,
             o.name as org_name, o.contact_name, o.contact_email, o.contact_phone, o.contact_confirmed_at
      from requests r join workspaces o on o.id = r.org_id
      where r.status = 'in_review' order by r.submitted_at
    `;
    const organizations = await tx`
      select id, name, city, contact_name, contact_email, contact_phone, contact_confirmed_at, created_at
      from workspaces where kind = 'organization' order by (contact_confirmed_at is null) desc, created_at desc
      limit 200
    `;
    return {
      requests: requests.map((r) => ({
        id: r.id,
        title: r.title,
        orgId: r.orgId,
        orgName: r.orgName,
        orgContact: { name: r.contactName, email: r.contactEmail, phone: r.contactPhone, confirmedAt: r.contactConfirmedAt },
        submittedAt: r.submittedAt,
        targetQuantity: r.targetQuantity,
        unitName: r.unitName,
        neededBy: r.neededBy,
      })),
      organizations: organizations as unknown as ReviewQueue["organizations"],
    };
  });
}

export async function getMyWorkspaces(ctx: ServiceContext) {
  if (!ctx.userId) return { organizations: [], groups: [], isReviewer: false, displayName: null as string | null };
  return read(ctx, async (tx) => {
    const rows = await tx`
      select w.id, w.name, w.kind, m.role from workspace_members m join workspaces w on w.id = m.workspace_id
      where m.user_id = ${ctx.userId} order by w.name
    `;
    const [profile] = await tx`select display_name from profiles where id = ${ctx.userId}`;
    const pick = (kind: string) =>
      rows
        .filter((r) => r.kind === kind)
        .map((r) => ({ id: r.id as string, name: r.name as string, role: r.role as "admin" | "member" }));
    return {
      organizations: pick("organization"),
      groups: pick("group"),
      isReviewer: await isPlatformAdmin(tx, ctx.userId),
      displayName: (profile?.displayName as string | undefined) ?? null,
    };
  });
}
