// Read models for a group's drive workspace, the public drive page and
// "My drives". Contributor identities appear only to the drive's coordinators;
// contributors see their own pledges and the group's totals.

import { describeDeadline, type DeadlineInfo } from "@/domain/dates";
import { describeBottleneck, driveChecklist, nextStepForCoordinator, type Bottleneck, type ChecklistStep, type NextStep } from "@/domain/guidance";
import { cleanWebhookQuestions, DEFAULT_WEBHOOK_QUESTIONS, IMPORT_SOURCE_LABEL, type WebhookQuestions } from "@/domain/import";
import { donationJourney, type DonationJourney } from "@/domain/journey";
import { requestPhase, type RequestPhase } from "@/domain/phase";
import { driveProgress, requestTotals, type ComponentProgress, type UnitStages } from "@/domain/quantities";
import type {
  CollectionEntryRecord,
  CommitmentRecord,
  ComponentRecord,
  DeliveryRecord,
  KitMovementRecord,
  PledgeRecord,
  RequestRecord,
} from "@/domain/types";
import type { Tx } from "../db/client";
import { isUuid, now, read, roleIn, type ServiceContext } from "../services/core";
import { activityFor, type ActivityItem } from "./activity";

export interface ProgressView {
  committed: number;
  active: boolean;
  stages: UnitStages;
  components: ComponentProgress[];
  supportedByCollected: number;
  packableNow: number;
  deliverableNow: number;
}

export interface PledgeView {
  id: string;
  componentId: string;
  componentName: string;
  quantity: number;
  received: number;
  outstanding: number;
  status: "waiting" | "partly_received" | "received" | "withdrawn" | "released";
  contributorName: string | null; // coordinators only
  // Coordinators only: set for pledges imported from a sign-up sheet.
  imported: { source: string; email: string | null } | null;
  isMine: boolean;
  note: string;
  createdAt: Date;
}

export interface CollectionView {
  id: string;
  componentName: string;
  usable: number;
  unusable: number;
  fromPledge: boolean;
  note: string;
  recordedByName: string;
  createdAt: Date;
  voided: boolean;
}

export interface DeliveryView {
  id: string;
  quantity: number;
  note: string;
  status: DeliveryRecord["status"];
  submittedAt: Date;
  accepted: number | null;
  notAccepted: number | null;
  reviewNote: string;
  reviewedAt: Date | null;
}

export type DriveRole = "coordinator" | "contributor" | "organization";

export interface DriveWorkspace {
  role: DriveRole;
  commitment: Pick<CommitmentRecord, "id" | "quantity" | "status" | "withdrawnAt" | "withdrawNote" | "createdAt">;
  group: { id: string; name: string; city: string; inviteToken: string | null };
  coordinators: string[];
  request: Pick<
    RequestRecord,
    | "id"
    | "title"
    | "requestType"
    | "unitName"
    | "neededBy"
    | "timezone"
    | "location"
    | "conditionNotes"
    | "substitutions"
    | "status"
    | "statusNote"
    | "handoverInstructions"
    | "coordinatorContact"
  > & { targetQuantity: number };
  org: { id: string; name: string; city: string };
  components: ComponentRecord[];
  progress: ProgressView;
  requestAvailable: number;
  phase: RequestPhase;
  deadline: DeadlineInfo;
  bottleneck: Bottleneck;
  nextStep: NextStep;
  checklist: ChecklistStep[];
  pledges: PledgeView[];
  collections: CollectionView[];
  deliveries: DeliveryView[];
  activity: ActivityItem[];
  journey: DonationJourney;
  formWebhook: { connected: boolean; disabled: boolean; lastUsedAt: Date | null; questions: WebhookQuestions } | null;
}

function pledgeStatus(p: PledgeRecord, received: number): PledgeView["status"] {
  if (p.status === "closed") return p.closedReason === "released" ? "released" : "withdrawn";
  if (received >= p.quantity) return "received";
  return received > 0 ? "partly_received" : "waiting";
}

async function loadDrive(tx: Tx, commitmentId: string) {
  const [commitment] = (await tx`select * from commitments where id = ${commitmentId}`) as unknown as CommitmentRecord[];
  if (!commitment) return null;
  const [request] = (await tx`select * from requests where id = ${commitment.requestId}`) as unknown as RequestRecord[];
  const components = (await tx`
    select * from request_components where request_id = ${request.id} order by position
  `) as unknown as ComponentRecord[];
  const commitments = (await tx`select * from commitments where request_id = ${request.id}`) as unknown as CommitmentRecord[];
  const deliveries = (await tx`
    select d.* from deliveries d join commitments c on c.id = d.commitment_id where c.request_id = ${request.id}
    order by d.submitted_at desc
  `) as unknown as DeliveryRecord[];
  const pledges = (await tx`
    select * from pledges where commitment_id = ${commitmentId} order by created_at desc
  `) as unknown as PledgeRecord[];
  const collections = (await tx`
    select * from collection_entries where commitment_id = ${commitmentId} order by created_at desc
  `) as unknown as CollectionEntryRecord[];
  const movements = (await tx`
    select * from kit_movements where commitment_id = ${commitmentId} order by created_at
  `) as unknown as KitMovementRecord[];
  const [group] = await tx`select id, name, city, invite_token from workspaces where id = ${commitment.groupId}`;
  const [org] = await tx`select id, name, city from workspaces where id = ${request.orgId}`;
  return { commitment, request, components, commitments, deliveries, pledges, collections, movements, group, org };
}

function computeProgress(data: NonNullable<Awaited<ReturnType<typeof loadDrive>>>) {
  return driveProgress({
    requestType: data.request.requestType,
    components: data.components,
    commitment: data.commitment,
    pledges: data.pledges,
    collections: data.collections,
    movements: data.movements,
    deliveries: data.deliveries.filter((d) => d.commitmentId === data.commitment.id),
  });
}

function toProgressView(p: ReturnType<typeof driveProgress>): ProgressView {
  return {
    committed: p.committed,
    active: p.active,
    stages: p.stages,
    components: p.components,
    supportedByCollected: p.supportedByCollected,
    packableNow: p.packableNow,
    deliverableNow: p.deliverableNow,
  };
}

export async function getDriveWorkspace(ctx: ServiceContext, commitmentId: string): Promise<DriveWorkspace | "not_allowed" | null> {
  if (!isUuid(commitmentId)) return null;
  const at = now(ctx);
  return read(ctx, async (tx) => {
    const data = await loadDrive(tx, commitmentId);
    if (!data) return null;
    const groupRole = await roleIn(tx, data.commitment.groupId, ctx.userId);
    const orgRole = groupRole ? null : await roleIn(tx, data.request.orgId, ctx.userId);
    const role: DriveRole | null = groupRole === "admin" ? "coordinator" : groupRole ? "contributor" : orgRole ? "organization" : null;
    if (!role) return ctx.userId ? "not_allowed" : null;

    const progress = computeProgress(data);
    const totals = requestTotals(data.request.targetQuantity ?? 0, data.commitments, data.deliveries);
    const phase = requestPhase(data.request, totals, at);
    const unit = data.request.unitName;
    const componentName = new Map(data.components.map((c) => [c.id, c.name]));

    const names = new Map<string, string>();
    if (role === "coordinator") {
      const ids = [...new Set([...data.pledges.flatMap((p) => (p.userId ? [p.userId] : [])), ...data.collections.map((c) => c.recordedBy)])];
      if (ids.length) {
        const rows = await tx`select id, display_name from profiles where id = any(${ids}::uuid[])`;
        for (const row of rows) names.set(row.id as string, row.displayName as string);
      }
    }
    const coordinatorRows = await tx`
      select m.user_id, p.display_name from workspace_members m join profiles p on p.id = m.user_id
      where m.workspace_id = ${data.commitment.groupId} and m.role = 'admin' order by m.created_at
    `;
    const coordinatorNames = new Map(coordinatorRows.map((r) => [r.userId as string, r.displayName as string]));

    const visiblePledges =
      role === "coordinator" ? data.pledges : role === "contributor" ? data.pledges.filter((p) => p.userId === ctx.userId) : [];
    const pledges: PledgeView[] = visiblePledges.map((p) => {
      const received = progress.pledgeReceived.get(p.id) ?? 0;
      return {
        id: p.id,
        componentId: p.componentId,
        componentName: componentName.get(p.componentId) ?? "",
        quantity: p.quantity,
        received,
        outstanding: p.status === "open" ? Math.max(0, p.quantity - received) : 0,
        status: pledgeStatus(p, received),
        contributorName: role === "coordinator" ? (p.guestName ?? (p.userId ? names.get(p.userId) : undefined) ?? "Member") : null,
        imported:
          role === "coordinator" && p.importSource ? { source: IMPORT_SOURCE_LABEL[p.importSource], email: p.guestEmail } : null,
        isMine: p.userId !== null && p.userId === ctx.userId,
        note: role === "coordinator" || p.userId === ctx.userId ? p.note : "",
        createdAt: p.createdAt,
      };
    });

    const collections: CollectionView[] =
      role === "coordinator"
        ? data.collections.map((c) => ({
            id: c.id,
            componentName: componentName.get(c.componentId) ?? "",
            usable: c.usableQuantity,
            unusable: c.unusableQuantity,
            fromPledge: Boolean(c.pledgeId),
            note: c.note,
            recordedByName: names.get(c.recordedBy) ?? "Coordinator",
            createdAt: c.createdAt,
            voided: Boolean(c.voidedAt),
          }))
        : [];

    const deliveries: DeliveryView[] = data.deliveries
      .filter((d) => d.commitmentId === commitmentId)
      .map((d) => ({
        id: d.id,
        quantity: d.quantity,
        note: d.note,
        status: d.status,
        submittedAt: d.submittedAt,
        accepted: d.acceptedQuantity,
        notAccepted: d.notAcceptedQuantity,
        reviewNote: d.reviewNote,
        reviewedAt: d.reviewedAt,
      }));

    const visiblePledgeIds = new Set(visiblePledges.map((p) => p.id));
    const journey = donationJourney({
      unitName: unit,
      orgName: data.org.name as string,
      requestTarget: data.request.targetQuantity ?? 0,
      requestAccepted: totals.accepted,
      showPersonalNote: role === "contributor",
      pledges: pledges.map((p) => ({
        id: p.id,
        componentName: p.componentName,
        quantity: p.quantity,
        createdAt: p.createdAt,
        contributorName: p.contributorName,
        withdrawn: p.status === "withdrawn" || p.status === "released",
      })),
      collections:
        role === "organization"
          ? []
          : data.collections
              .filter((c) => c.pledgeId && visiblePledgeIds.has(c.pledgeId))
              .map((c) => ({
                id: c.id,
                pledgeId: c.pledgeId,
                usableQuantity: c.usableQuantity,
                createdAt: c.createdAt,
                recordedByName:
                  role === "coordinator"
                    ? names.get(c.recordedBy) ?? coordinatorNames.get(c.recordedBy) ?? "A coordinator"
                    : coordinatorNames.get(c.recordedBy) ?? "A coordinator",
                voided: Boolean(c.voidedAt),
              })),
      movements: data.movements.map((m) => ({ id: m.id, kind: m.kind, quantity: m.quantity, createdAt: m.createdAt })),
      deliveries: data.deliveries
        .filter((d) => d.commitmentId === commitmentId)
        .map((d) => ({
          id: d.id,
          quantity: d.quantity,
          status: d.status,
          submittedAt: d.submittedAt,
          acceptedQuantity: d.acceptedQuantity,
          reviewNote: role === "organization" ? "" : d.reviewNote,
          reviewedAt: d.reviewedAt,
        })),
    });

    const [hook] =
      role === "coordinator"
        ? await tx`select last_used_at, disabled_at, questions from form_webhooks where commitment_id = ${commitmentId}`
        : [];
    const formWebhook =
      role === "coordinator"
        ? {
            connected: Boolean(hook),
            disabled: Boolean(hook?.disabledAt),
            lastUsedAt: (hook?.lastUsedAt as Date) ?? null,
            questions: cleanWebhookQuestions(hook?.questions ?? DEFAULT_WEBHOOK_QUESTIONS),
          }
        : null;

    const activity = await activityFor(tx, {
      commitmentId,
      audiences: role === "organization" ? ["org", "both"] : ["group", "both"],
      // Contributors see the drive's history without other people's names.
      showNames: role !== "contributor",
      viewerId: ctx.userId,
      limit: 30,
    });

    return {
      role,
      commitment: {
        id: data.commitment.id,
        quantity: data.commitment.quantity,
        status: data.commitment.status,
        withdrawnAt: data.commitment.withdrawnAt,
        withdrawNote: data.commitment.withdrawNote,
        createdAt: data.commitment.createdAt,
      },
      group: {
        id: data.group.id,
        name: data.group.name,
        city: data.group.city,
        inviteToken: role === "coordinator" ? (data.group.inviteToken as string) : null,
      },
      coordinators: coordinatorRows.map((r) => r.displayName as string),
      request: {
        id: data.request.id,
        title: data.request.title,
        requestType: data.request.requestType,
        unitName: unit,
        targetQuantity: data.request.targetQuantity ?? 0,
        neededBy: data.request.neededBy,
        timezone: data.request.timezone,
        location: data.request.location,
        conditionNotes: data.request.conditionNotes,
        substitutions: data.request.substitutions,
        status: data.request.status,
        statusNote: data.request.status === "closed" || data.request.status === "cancelled" ? data.request.statusNote : "",
        handoverInstructions: data.request.handoverInstructions,
        coordinatorContact: data.request.coordinatorContact,
      },
      org: { id: data.org.id, name: data.org.name, city: data.org.city },
      components: data.components,
      progress: toProgressView(progress),
      requestAvailable: totals.available,
      phase,
      deadline: data.request.neededBy
        ? describeDeadline(data.request.neededBy, data.request.timezone, at)
        : { daysLeft: 0, passed: false, soon: false, description: "" },
      bottleneck: describeBottleneck(progress, unit),
      nextStep: nextStepForCoordinator(progress, unit, data.org.name),
      checklist: driveChecklist(progress, unit, data.org.name, data.pledges.length),
      pledges,
      collections,
      deliveries,
      activity,
      journey,
      formWebhook,
    };
  });
}

// The page behind a drive's share link: approved public information and totals only.
export interface PublicDrive {
  commitmentId: string;
  status: CommitmentRecord["status"];
  quantity: number;
  group: { id: string; name: string; city: string };
  request: { id: string; title: string; requestType: RequestRecord["requestType"]; unitName: string; neededBy: string; timezone: string; status: RequestRecord["status"] };
  org: { name: string; city: string };
  progress: ProgressView;
  deadline: DeadlineInfo;
  bottleneck: Bottleneck;
  viewerIsMember: boolean;
}

export async function getPublicDrive(ctx: ServiceContext, commitmentId: string): Promise<PublicDrive | null> {
  if (!isUuid(commitmentId)) return null;
  const at = now(ctx);
  return read(ctx, async (tx) => {
    const data = await loadDrive(tx, commitmentId);
    if (!data || !["published", "closed", "cancelled"].includes(data.request.status)) return null;
    const progress = computeProgress(data);
    const viewerIsMember = Boolean(await roleIn(tx, data.commitment.groupId, ctx.userId));
    return {
      commitmentId,
      status: data.commitment.status,
      quantity: data.commitment.quantity,
      group: { id: data.group.id as string, name: data.group.name, city: data.group.city },
      request: {
        id: data.request.id,
        title: data.request.title,
        requestType: data.request.requestType,
        unitName: data.request.unitName,
        neededBy: data.request.neededBy ?? "",
        timezone: data.request.timezone,
        status: data.request.status,
      },
      org: { name: data.org.name, city: data.org.city },
      progress: toProgressView(progress),
      deadline: data.request.neededBy
        ? describeDeadline(data.request.neededBy, data.request.timezone, at)
        : { daysLeft: 0, passed: false, soon: false, description: "" },
      bottleneck: describeBottleneck(progress, data.request.unitName),
      viewerIsMember,
    };
  });
}

// "My drives": every drive of every group the person belongs to.
export interface MyDriveItem {
  commitmentId: string;
  groupId: string;
  groupName: string;
  role: "coordinator" | "contributor";
  requestId: string;
  requestTitle: string;
  orgName: string;
  unitName: string;
  requestType: RequestRecord["requestType"];
  quantity: number;
  status: CommitmentRecord["status"];
  accepted: number;
  pendingReview: number;
  ready: number;
  toBuild: number;
  neededBy: string;
  deadline: DeadlineInfo;
  nextStep: NextStep;
  myOpenPledges: number;
  // Coordinators only (0 for members): how far the drive has got, for the getting-started card.
  pledgeCount: number;
  collectedItems: number;
}

export interface MyGroup {
  id: string;
  name: string;
  city: string;
  role: "admin" | "member";
}

export async function getMyDrives(ctx: ServiceContext): Promise<{ drives: MyDriveItem[]; groups: MyGroup[] }> {
  const at = now(ctx);
  const userId = ctx.userId;
  if (!userId) return { drives: [], groups: [] };
  return read(ctx, async (tx) => {
    const groups = (await tx`
      select w.id, w.name, w.city, m.role from workspace_members m join workspaces w on w.id = m.workspace_id
      where m.user_id = ${userId} and w.kind = 'group' order by w.name
    `) as unknown as MyGroup[];
    const commitmentRows = groups.length
      ? await tx`
          select id from commitments where group_id = any(${groups.map((g) => g.id)}::uuid[])
          order by (status = 'active') desc, created_at desc
        `
      : [];
    const drives: MyDriveItem[] = [];
    for (const row of commitmentRows) {
      const data = await loadDrive(tx, row.id as string);
      if (!data) continue;
      const progress = computeProgress(data);
      const group = groups.find((g) => g.id === data.commitment.groupId)!;
      drives.push({
        commitmentId: data.commitment.id,
        groupId: group.id,
        groupName: group.name,
        role: group.role === "admin" ? "coordinator" : "contributor",
        requestId: data.request.id,
        requestTitle: data.request.title,
        orgName: data.org.name,
        unitName: data.request.unitName,
        requestType: data.request.requestType,
        quantity: data.commitment.quantity,
        status: data.commitment.status,
        accepted: progress.stages.accepted,
        pendingReview: progress.stages.pendingReview,
        ready: progress.stages.ready,
        toBuild: progress.stages.toBuild,
        neededBy: data.request.neededBy ?? "",
        deadline: data.request.neededBy
          ? describeDeadline(data.request.neededBy, data.request.timezone, at)
          : { daysLeft: 0, passed: false, soon: false, description: "" },
        nextStep: nextStepForCoordinator(progress, data.request.unitName, data.org.name),
        myOpenPledges: data.pledges
          .filter((p) => p.userId === userId && p.status === "open")
          .reduce((sum, p) => sum + (progress.pledgeOutstanding.get(p.id) ?? 0), 0),
        pledgeCount: group.role === "admin" ? data.pledges.length : 0,
        collectedItems: group.role === "admin" ? progress.components.reduce((sum, c) => sum + c.collected, 0) : 0,
      });
    }
    return { drives, groups };
  });
}
