// Shared plumbing for every server operation: which schema to use, who is
// acting, transactions, retry protection and the activity log.
//
// Services take a ServiceContext instead of reading cookies themselves, so the
// same code runs for the real app, a demo sandbox, and the integration tests.

import { randomUUID } from "node:crypto";
import { DomainError } from "@/domain/errors";
import { driveInvariantViolations, driveProgress, requestTotals, requestInvariantViolations } from "@/domain/quantities";
import type {
  CollectionEntryRecord,
  CommitmentRecord,
  ComponentRecord,
  DeliveryRecord,
  KitMovementRecord,
  PledgeRecord,
  RequestRecord,
} from "@/domain/types";
import { inSchema, type Sql, type Tx } from "../db/client";

export interface ServiceContext {
  sql: Sql;
  schema: string;
  // The signed-in person (or demo persona), or null for a visitor.
  userId: string | null;
  now?: () => Date;
}

export function now(ctx: ServiceContext): Date {
  return ctx.now ? ctx.now() : new Date();
}

export function requireUser(ctx: ServiceContext): string {
  if (!ctx.userId) throw new DomainError("sign_in_required", "Sign in to continue.");
  return ctx.userId;
}

export function read<T>(ctx: ServiceContext, work: (tx: Tx) => Promise<T>): Promise<T> {
  return inSchema(ctx.sql, ctx.schema, work);
}

// Runs a change in one transaction. With an idempotency key, a repeated
// submission (double click, network retry) returns the first result instead
// of acting again. A failed attempt stores nothing, so it can be retried.
export async function mutate<T>(
  ctx: ServiceContext,
  options: { action: string; idempotencyKey?: string | null },
  work: (tx: Tx, userId: string) => Promise<T>,
): Promise<T> {
  const userId = requireUser(ctx);
  const key = options.idempotencyKey && isUuid(options.idempotencyKey) ? options.idempotencyKey : null;
  return inSchema(ctx.sql, ctx.schema, async (tx) => {
    if (key) {
      // If another transaction holds this key, this insert waits for it to
      // finish, then sees the conflict and returns the stored result.
      const inserted = await tx`
        insert into idempotency_keys (key, user_id, action)
        values (${key}, ${userId}, ${options.action})
        on conflict (key) do nothing
        returning key
      `;
      if (inserted.length === 0) {
        const [previous] = await tx`select user_id, action, result from idempotency_keys where key = ${key}`;
        if (!previous || previous.userId !== userId || previous.action !== options.action) {
          throw new DomainError("conflict", "This form was already used. Reload the page and try again.");
        }
        return previous.result as T;
      }
    }
    const result = await work(tx, userId);
    if (key) {
      await tx`update idempotency_keys set result = ${tx.json(toJson(result))} where key = ${key}`;
    }
    return result;
  });
}

function toJson(value: unknown): postgresJson {
  return JSON.parse(JSON.stringify(value ?? null));
}
type postgresJson = Parameters<Tx["json"]>[0];

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function newId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Memberships and permissions

export type Role = "admin" | "member";

export async function roleIn(tx: Tx, workspaceId: string, userId: string | null): Promise<Role | null> {
  if (!userId) return null;
  const [row] = await tx`
    select role from workspace_members where workspace_id = ${workspaceId} and user_id = ${userId}
  `;
  return (row?.role as Role | undefined) ?? null;
}

export async function isPlatformAdmin(tx: Tx, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const [row] = await tx`select 1 as ok from platform_admins where user_id = ${userId}`;
  return Boolean(row);
}

export async function requireRole(
  tx: Tx,
  workspaceId: string,
  userId: string,
  needed: Role,
  message = "You don't have permission to do that.",
): Promise<Role> {
  const role = await roleIn(tx, workspaceId, userId);
  if (!role || (needed === "admin" && role !== "admin")) {
    throw new DomainError("not_allowed", message);
  }
  return role;
}

export async function requirePlatformAdmin(tx: Tx, userId: string): Promise<void> {
  if (!(await isPlatformAdmin(tx, userId))) {
    throw new DomainError("not_allowed", "Only KitGap reviewers can do that.");
  }
}

// ---------------------------------------------------------------------------
// Loading the records a rule needs

export interface RequestState {
  request: RequestRecord;
  components: ComponentRecord[];
  commitments: CommitmentRecord[];
  deliveries: DeliveryRecord[];
}

// Loads a request and its drives. With lock: true the request row is locked
// until the transaction ends; every change to a request's quantities takes
// this lock first, so concurrent changes are applied one after another and
// each one sees the result of the previous.
export async function loadRequestState(tx: Tx, requestId: string, options: { lock: boolean }): Promise<RequestState> {
  if (!isUuid(requestId)) throw new DomainError("not_found", "That request doesn't exist.");
  const [request] = options.lock
    ? await tx`select * from requests where id = ${requestId} for update`
    : await tx`select * from requests where id = ${requestId}`;
  if (!request) throw new DomainError("not_found", "That request doesn't exist.");
  const components = await tx`select * from request_components where request_id = ${requestId} order by position`;
  const commitments = await tx`select * from commitments where request_id = ${requestId} order by created_at`;
  const deliveries = await tx`
    select d.* from deliveries d join commitments c on c.id = d.commitment_id
    where c.request_id = ${requestId} order by d.submitted_at
  `;
  return {
    request: request as unknown as RequestRecord,
    components: components as unknown as ComponentRecord[],
    commitments: commitments as unknown as CommitmentRecord[],
    deliveries: deliveries as unknown as DeliveryRecord[],
  };
}

export interface DriveState extends RequestState {
  commitment: CommitmentRecord;
  pledges: PledgeRecord[];
  collections: CollectionEntryRecord[];
  movements: KitMovementRecord[];
  driveDeliveries: DeliveryRecord[];
}

export async function commitmentRequestId(tx: Tx, commitmentId: string): Promise<string> {
  if (!isUuid(commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
  const [row] = await tx`select request_id from commitments where id = ${commitmentId}`;
  if (!row) throw new DomainError("not_found", "That drive doesn't exist.");
  return row.requestId as string;
}

export async function loadDriveState(tx: Tx, commitmentId: string, options: { lock: boolean }): Promise<DriveState> {
  const requestId = await commitmentRequestId(tx, commitmentId);
  const state = await loadRequestState(tx, requestId, options);
  const commitment = state.commitments.find((c) => c.id === commitmentId)!;
  const pledges = await tx`select * from pledges where commitment_id = ${commitmentId} order by created_at`;
  const collections = await tx`select * from collection_entries where commitment_id = ${commitmentId} order by created_at`;
  const movements = await tx`select * from kit_movements where commitment_id = ${commitmentId} order by created_at`;
  return {
    ...state,
    commitment,
    pledges: pledges as unknown as PledgeRecord[],
    collections: collections as unknown as CollectionEntryRecord[],
    movements: movements as unknown as KitMovementRecord[],
    driveDeliveries: state.deliveries.filter((d) => d.commitmentId === commitmentId),
  };
}

export function progressOf(state: DriveState) {
  return driveProgress({
    requestType: state.request.requestType,
    components: state.components,
    commitment: state.commitment,
    pledges: state.pledges,
    collections: state.collections,
    movements: state.movements,
    deliveries: state.driveDeliveries,
  });
}

export function totalsOf(state: RequestState) {
  return requestTotals(state.request.targetQuantity ?? 0, state.commitments, state.deliveries);
}

// Safety net run after every quantity change, against the records as they now
// stand in the database. If a rule above missed something, the transaction is
// rolled back instead of saving an impossible state.
export async function assertInvariants(tx: Tx, requestId: string, commitmentId?: string): Promise<void> {
  const state = await loadRequestState(tx, requestId, { lock: false });
  const problems = requestInvariantViolations(totalsOf(state));
  if (commitmentId) {
    const drive = await loadDriveState(tx, commitmentId, { lock: false });
    problems.push(...driveInvariantViolations(progressOf(drive)));
  }
  if (problems.length > 0) {
    throw new Error(`Invariant violation, change rolled back: ${problems.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
// Activity log

export interface ActivityInput {
  kind: string;
  audience: "org" | "group" | "both";
  actorId: string | null;
  requestId?: string | null;
  commitmentId?: string | null;
  workspaceId?: string | null;
  data?: Record<string, unknown>;
}

export async function logActivity(tx: Tx, input: ActivityInput): Promise<void> {
  await tx`
    insert into activity (kind, audience, actor_id, request_id, commitment_id, workspace_id, data)
    values (
      ${input.kind}, ${input.audience}, ${input.actorId}, ${input.requestId ?? null},
      ${input.commitmentId ?? null}, ${input.workspaceId ?? null}, ${tx.json(toJson(input.data ?? {}))}
    )
  `;
}
