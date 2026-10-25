// Read models for the public directory and the request page.
//
// Public visibility is decided here, field by field: summaries and detail
// pages for visitors only ever include the fields listed in PublicRequest.
// Private fields (handover instructions, coordinator contact, organization
// contact details, reviewer notes) are added only for people allowed to see them.

import { isCloseToConfirmed } from "@/domain/guidance";
import { describeDeadline, type DeadlineInfo } from "@/domain/dates";
import { acceptsNewDrives, requestPhase, type RequestPhase } from "@/domain/phase";
import { requestTotals, supplyList, type RequestTotals, type SupplyLine } from "@/domain/quantities";
import type { Category, CommitmentRecord, ComponentRecord, DeliveryRecord, RequestRecord, RequestType } from "@/domain/types";
import type { Tx } from "../db/client";
import { isPlatformAdmin, isUuid, now, read, type ServiceContext } from "../services/core";

export interface PublicOrg {
  id: string;
  name: string;
  city: string;
  about: string;
  contactConfirmedAt: Date | null;
}

export interface PublicRequest {
  id: string;
  title: string;
  need: string;
  beneficiaries: string;
  category: Category;
  requestType: RequestType;
  unitName: string;
  targetQuantity: number;
  conditionNotes: string;
  substitutions: string;
  neededBy: string;
  timezone: string;
  location: string;
  fundraisingUrl: string | null;
  status: RequestRecord["status"];
  statusNote: string; // public only for closed/cancelled explanations
  publishedAt: Date | null;
}

export interface RequestSummary {
  request: PublicRequest;
  org: PublicOrg;
  components: Pick<ComponentRecord, "id" | "name" | "quantityPerUnit" | "details" | "position">[];
  totals: RequestTotals;
  phase: RequestPhase;
  deadline: DeadlineInfo;
}

const PUBLIC_STATUSES = ["published", "closed", "cancelled"] as const;

function toPublicRequest(r: RequestRecord): PublicRequest {
  const explainsState = r.status === "closed" || r.status === "cancelled";
  return {
    id: r.id,
    title: r.title,
    need: r.need,
    beneficiaries: r.beneficiaries,
    category: r.category,
    requestType: r.requestType,
    unitName: r.unitName,
    targetQuantity: r.targetQuantity ?? 0,
    conditionNotes: r.conditionNotes,
    substitutions: r.substitutions,
    neededBy: r.neededBy ?? "",
    timezone: r.timezone,
    location: r.location,
    fundraisingUrl: r.fundraisingUrl,
    status: r.status,
    statusNote: explainsState ? r.statusNote : "",
    publishedAt: r.publishedAt,
  };
}

async function loadOrgs(tx: Tx, orgIds: string[]): Promise<Map<string, PublicOrg>> {
  if (orgIds.length === 0) return new Map();
  const rows = await tx`
    select id, name, city, about, contact_confirmed_at from workspaces where id = any(${orgIds}::uuid[])
  `;
  return new Map(rows.map((row) => [row.id as string, row as unknown as PublicOrg]));
}

export async function loadRequestNumbers(tx: Tx, requestIds: string[]) {
  if (requestIds.length === 0) {
    return { components: [] as ComponentRecord[], commitments: [] as CommitmentRecord[], deliveries: [] as DeliveryRecord[] };
  }
  const components = (await tx`
    select * from request_components where request_id = any(${requestIds}::uuid[]) order by position
  `) as unknown as ComponentRecord[];
  const commitments = (await tx`
    select * from commitments where request_id = any(${requestIds}::uuid[]) order by created_at
  `) as unknown as CommitmentRecord[];
  const deliveries = (await tx`
    select d.* from deliveries d join commitments c on c.id = d.commitment_id
    where c.request_id = any(${requestIds}::uuid[])
  `) as unknown as DeliveryRecord[];
  return { components, commitments, deliveries };
}

export function summarize(
  request: RequestRecord,
  org: PublicOrg,
  numbers: Awaited<ReturnType<typeof loadRequestNumbers>>,
  at: Date,
): RequestSummary {
  const components = numbers.components.filter((c) => c.requestId === request.id);
  const commitments = numbers.commitments.filter((c) => c.requestId === request.id);
  const ids = new Set(commitments.map((c) => c.id));
  const deliveries = numbers.deliveries.filter((d) => ids.has(d.commitmentId));
  const totals = requestTotals(request.targetQuantity ?? 0, commitments, deliveries);
  return {
    request: toPublicRequest(request),
    org,
    components: components.map(({ id, name, quantityPerUnit, details, position }) => ({ id, name, quantityPerUnit, details, position })),
    totals,
    phase: requestPhase(request, totals, at),
    deadline: request.neededBy
      ? describeDeadline(request.neededBy, request.timezone, at)
      : { daysLeft: 0, passed: false, soon: false, description: "" },
  };
}

export type DirectoryStatus = "open" | "in_progress" | "completed" | "all" | "close";
export type DirectorySort = "deadline" | "newest" | "progress" | "almost";

export interface DirectoryFilters {
  q?: string;
  category?: string;
  status?: DirectoryStatus;
  sort?: DirectorySort;
}

const STATUS_PHASES: Record<Exclude<DirectoryStatus, "close">, RequestPhase[]> = {
  open: ["open"],
  in_progress: ["fully_committed", "past_due", "closed"],
  completed: ["fulfilled"],
  all: ["open", "fully_committed", "past_due", "closed", "fulfilled", "cancelled"],
};

export async function listPublicRequests(ctx: ServiceContext, filters: DirectoryFilters = {}): Promise<RequestSummary[]> {
  const at = now(ctx);
  return read(ctx, async (tx) => {
    const q = (filters.q ?? "").trim().slice(0, 100);
    const pattern = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    const category = filters.category && filters.category !== "all" ? filters.category : null;
    const rows = (await tx`
      select r.* from requests r
      join workspaces o on o.id = r.org_id
      where r.status in ${tx(PUBLIC_STATUSES)}
        -- A club's own drive (recipient not on KitGap) is never listed.
        and o.kind = 'organization'
        and (${category}::text is null or r.category = ${category})
        and (
          ${pattern}::text is null
          or r.title ilike ${pattern} or r.need ilike ${pattern} or r.location ilike ${pattern}
          or r.unit_name ilike ${pattern} or o.name ilike ${pattern}
          or exists (select 1 from request_components rc where rc.request_id = r.id and rc.name ilike ${pattern})
        )
      order by r.needed_by asc, r.published_at desc
      limit 500
    `) as unknown as RequestRecord[];
    const orgs = await loadOrgs(tx, [...new Set(rows.map((r) => r.orgId))]);
    const numbers = await loadRequestNumbers(tx, rows.map((r) => r.id));
    const status = filters.status ?? "open";
    const wanted = status === "close" ? null : new Set(STATUS_PHASES[status] ?? STATUS_PHASES.open);
    const summaries = rows
      .map((r) => summarize(r, orgs.get(r.orgId)!, numbers, at))
      .filter((s) => (wanted ? wanted.has(s.phase) : isCloseToConfirmed(s.totals.accepted, s.totals.target)));
    if (filters.sort === "newest") {
      summaries.sort((a, b) => (b.request.publishedAt?.getTime() ?? 0) - (a.request.publishedAt?.getTime() ?? 0));
    } else if (filters.sort === "progress") {
      const share = (s: RequestSummary) => (s.totals.target > 0 ? s.totals.accepted / s.totals.target : 0);
      summaries.sort((a, b) => share(b) - share(a));
    } else if (filters.sort === "almost") {
      const left = (s: RequestSummary) => (s.totals.target > 0 ? s.totals.available / s.totals.target : 1);
      summaries.sort((a, b) => left(a) - left(b) || (a.request.neededBy ?? "").localeCompare(b.request.neededBy ?? ""));
    }
    return summaries;
  });
}

// ---------------------------------------------------------------------------

export interface PublicDriveListing {
  commitmentId: string;
  groupId: string;
  groupName: string;
  groupCity: string;
  quantity: number;
  status: CommitmentRecord["status"];
  accepted: number;
  pendingReview: number;
  startedAt: Date;
}

export interface AdoptableGroup {
  id: string;
  name: string;
  existingCommitmentId: string | null;
}

export interface RequestDetail extends RequestSummary {
  supply: SupplyLine[];
  drives: PublicDriveListing[];
  updates: { id: string; body: string; createdAt: Date }[];
  viewer: {
    signedIn: boolean;
    isOrgMember: boolean;
    isOrgAdmin: boolean;
    isReviewer: boolean;
    adminGroups: AdoptableGroup[];
    // Drives on this request the viewer belongs to.
    memberDriveIds: string[];
    canAdopt: boolean;
  };
  // Only for the organization, reviewers, and groups with a drive.
  privateDetails: {
    handoverInstructions: string;
    coordinatorContact: string;
  } | null;
  // Only for the organization and reviewers.
  reviewNote: string | null;
}

export async function getRequestDetail(ctx: ServiceContext, requestId: string): Promise<RequestDetail | null> {
  if (!isUuid(requestId)) return null;
  const at = now(ctx);
  return read(ctx, async (tx) => {
    const [request] = (await tx`select * from requests where id = ${requestId}`) as unknown as RequestRecord[];
    if (!request) return null;
    // A club's own drive has no public request page: the club sees it on its
    // drive page, and everyone else on the drive's share page.
    const [owner] = await tx`select kind from workspaces where id = ${request.orgId}`;
    if (owner?.kind === "recipient") return null;
    const userId = ctx.userId;
    const [orgMembership] = userId
      ? await tx`select role from workspace_members where workspace_id = ${request.orgId} and user_id = ${userId}`
      : [];
    const isReviewer = await isPlatformAdmin(tx, userId);
    const isOrgMember = Boolean(orgMembership);
    const isPublic = (PUBLIC_STATUSES as readonly string[]).includes(request.status);
    if (!isPublic && !isOrgMember && !isReviewer) return null;

    const orgs = await loadOrgs(tx, [request.orgId]);
    const numbers = await loadRequestNumbers(tx, [request.id]);
    const summary = summarize(request, orgs.get(request.orgId)!, numbers, at);

    const groupRows = await tx`
      select id, name, city from workspaces where id = any(${numbers.commitments.map((c) => c.groupId)}::uuid[])
    `;
    const groups = new Map(groupRows.map((g) => [g.id as string, g]));
    const drives: PublicDriveListing[] = numbers.commitments.map((c) => {
      const deliveries = numbers.deliveries.filter((d) => d.commitmentId === c.id);
      const totals = requestTotals(c.quantity, [c], deliveries);
      return {
        commitmentId: c.id,
        groupId: c.groupId,
        groupName: groups.get(c.groupId)?.name ?? "A group",
        groupCity: groups.get(c.groupId)?.city ?? "",
        quantity: c.quantity,
        status: c.status,
        accepted: totals.accepted,
        pendingReview: totals.pendingReview,
        startedAt: c.createdAt,
      };
    });

    const myGroups = userId
      ? await tx`
          select w.id, w.name, m.role from workspace_members m join workspaces w on w.id = m.workspace_id
          where m.user_id = ${userId} and w.kind = 'group' order by w.name
        `
      : [];
    const myGroupIds = new Set(myGroups.map((g) => g.id as string));
    const adminGroups: AdoptableGroup[] = myGroups
      .filter((g) => g.role === "admin")
      .map((g) => ({
        id: g.id as string,
        name: g.name as string,
        existingCommitmentId:
          numbers.commitments.find((c) => c.groupId === g.id && c.status === "active")?.id ?? null,
      }));
    const memberDriveIds = numbers.commitments.filter((c) => myGroupIds.has(c.groupId)).map((c) => c.id);
    const hasActiveDrive = numbers.commitments.some((c) => myGroupIds.has(c.groupId) && c.status === "active");

    const updates = isPublic
      ? ((await tx`
          select id, data->>'body' as body, created_at from activity
          where request_id = ${request.id} and kind = 'request.update_posted'
          order by id desc limit 20
        `) as unknown as { id: string; body: string; createdAt: Date }[])
      : [];

    return {
      ...summary,
      supply: supplyList(summary.components, summary.request.targetQuantity),
      drives,
      updates,
      viewer: {
        signedIn: Boolean(userId),
        isOrgMember,
        isOrgAdmin: orgMembership?.role === "admin",
        isReviewer,
        adminGroups,
        memberDriveIds,
        canAdopt: acceptsNewDrives(summary.phase),
      },
      privateDetails:
        isOrgMember || isReviewer || hasActiveDrive
          ? { handoverInstructions: request.handoverInstructions, coordinatorContact: request.coordinatorContact }
          : null,
      reviewNote: isOrgMember || isReviewer ? request.statusNote : null,
    };
  });
}
