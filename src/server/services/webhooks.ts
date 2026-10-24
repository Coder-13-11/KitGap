// Live Google Forms sync. The coordinator gets a secret URL once; we store
// only its hash. Each form response becomes a guest pledge through the same
// plan as a CSV import. Nothing private is ever returned to the caller.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import {
  cleanWebhookQuestions,
  DEFAULT_WEBHOOK_QUESTIONS,
  planImport,
  withSuggestedAnswers,
  tableFromFormAnswers,
  type WebhookQuestions,
} from "@/domain/import";
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
  read,
  requireRole,
  type ServiceContext,
} from "./core";

export const WEBHOOK_RATE_PER_MINUTE = 30;

export interface FormWebhookView {
  connected: boolean;
  disabled: boolean;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  questions: WebhookQuestions;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

function equalHash(given: string, stored: string): boolean {
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getFormWebhook(ctx: ServiceContext, commitmentId: string): Promise<FormWebhookView> {
  if (!isUuid(commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
  return read(ctx, async (tx) => {
    const [row] = await tx`
      select created_at, last_used_at, disabled_at, questions from form_webhooks where commitment_id = ${commitmentId}
    `;
    return {
      connected: Boolean(row),
      disabled: Boolean(row?.disabledAt),
      createdAt: (row?.createdAt as Date) ?? null,
      lastUsedAt: (row?.lastUsedAt as Date) ?? null,
      questions: cleanWebhookQuestions(row?.questions ?? DEFAULT_WEBHOOK_QUESTIONS),
    };
  });
}

export async function connectFormWebhook(
  ctx: ServiceContext,
  input: { commitmentId: string; questions?: unknown },
): Promise<{ secret: string; questions: WebhookQuestions }> {
  return mutate(ctx, { action: "webhook.connect" }, async (tx, userId) => {
    if (!isUuid(input.commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
    const state = await loadDriveState(tx, input.commitmentId, { lock: true });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can connect a form.");
    if (state.commitment.status !== "active") throw new DomainError("closed", "This drive was withdrawn, so a form can't be connected.");
    const questions = cleanWebhookQuestions(input.questions ?? DEFAULT_WEBHOOK_QUESTIONS);
    const secret = newSecret();
    const [existing] = await tx`select id from form_webhooks where commitment_id = ${state.commitment.id}`;
    if (existing) {
      await tx`
        update form_webhooks
        set secret_hash = ${hashSecret(secret)}, questions = ${tx.json(JSON.parse(JSON.stringify(questions)))}, rotated_at = ${now(ctx)}, disabled_at = null
        where id = ${existing.id}
      `;
    } else {
      await tx`
        insert into form_webhooks (commitment_id, secret_hash, questions, created_by)
        values (${state.commitment.id}, ${hashSecret(secret)}, ${tx.json(JSON.parse(JSON.stringify(questions)))}, ${userId})
      `;
    }
    return { secret, questions };
  });
}

export async function saveWebhookQuestions(
  ctx: ServiceContext,
  input: { commitmentId: string; questions: unknown },
): Promise<WebhookQuestions> {
  return mutate(ctx, { action: "webhook.questions" }, async (tx, userId) => {
    if (!isUuid(input.commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
    const state = await loadDriveState(tx, input.commitmentId, { lock: false });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can change the form questions.");
    const [hook] = await tx`select id from form_webhooks where commitment_id = ${state.commitment.id}`;
    if (!hook) throw new DomainError("not_found", "Connect a Google Form first.");
    const questions = cleanWebhookQuestions(input.questions);
    await tx`update form_webhooks set questions = ${tx.json(JSON.parse(JSON.stringify(questions)))} where id = ${hook.id}`;
    return questions;
  });
}

export async function disableFormWebhook(ctx: ServiceContext, input: { commitmentId: string }) {
  return mutate(ctx, { action: "webhook.disable" }, async (tx, userId) => {
    if (!isUuid(input.commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
    const state = await loadDriveState(tx, input.commitmentId, { lock: false });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can turn the form off.");
    await tx`
      update form_webhooks set disabled_at = ${now(ctx)}
      where commitment_id = ${state.commitment.id} and disabled_at is null
    `;
    return { disabled: true };
  });
}

export async function disableWebhookForDrive(tx: Tx, commitmentId: string, at: Date) {
  await tx`update form_webhooks set disabled_at = ${at} where commitment_id = ${commitmentId} and disabled_at is null`;
}

export interface WebhookResult {
  created: number;
  quantity: number;
  overCap: number;
}

function answersFromBody(body: unknown): { responseId: string; answers: Record<string, string> } {
  if (!body || typeof body !== "object") throw new DomainError("invalid_input", "Send a JSON object.");
  const raw = body as Record<string, unknown>;
  const responseId = typeof raw.responseId === "string" ? raw.responseId.trim().slice(0, 200) : "";
  if (!responseId) throw new DomainError("invalid_input", "Each response needs an id.");
  const source = raw.answers && typeof raw.answers === "object" && !Array.isArray(raw.answers) ? raw.answers : raw;
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>).slice(0, 60)) {
    if (key === "responseId" || key === "timestamp") continue;
    if (typeof value === "string" || typeof value === "number") answers[key.slice(0, 200)] = String(value).slice(0, 500);
  }
  return { responseId, answers };
}

// Called from the public endpoint. ctx.userId is unused; the coordinator who
// connected the form is recorded as the actor.
export async function ingestFormWebhook(ctx: ServiceContext, secret: string, body: unknown): Promise<WebhookResult> {
  if (!secret || secret.length < 16 || secret.length > 200) throw new DomainError("not_found", "Not found.");
  const incomingHash = hashSecret(secret);
  const parsed = answersFromBody(body);
  const found = await read(ctx, async (tx) => {
    const [row] = await tx`select created_by, secret_hash from form_webhooks where secret_hash = ${incomingHash}`;
    return row ?? null;
  });
  if (!found || !equalHash(incomingHash, found.secretHash as string)) throw new DomainError("not_found", "Not found.");

  return mutate({ ...ctx, userId: found.createdBy as string }, { action: "pledge.webhook" }, async (tx) => {
    const [hook] = await tx`
      select id, commitment_id, secret_hash, questions, disabled_at, created_by
      from form_webhooks where secret_hash = ${incomingHash}
    `;
    if (!hook || !equalHash(incomingHash, hook.secretHash as string)) throw new DomainError("not_found", "Not found.");
    if (hook.disabledAt) throw new DomainError("closed", "This link is off.");

    await tx`insert into form_webhook_hits (webhook_id) values (${hook.id})`;
    await tx`delete from form_webhook_hits where webhook_id = ${hook.id} and created_at < now() - interval '2 hours'`;
    const [{ n }] = await tx`
      select count(*)::int as n from form_webhook_hits
      where webhook_id = ${hook.id} and created_at > now() - interval '1 minute'
    `;
    if (Number(n) > WEBHOOK_RATE_PER_MINUTE) {
      throw new DomainError("conflict", "Too many submissions. Try again in a minute.");
    }

    const state = await loadDriveState(tx, hook.commitmentId as string, { lock: true });
    if (state.commitment.status !== "active" || !acceptsDeliveries(state.request.status)) {
      await tx`update form_webhooks set disabled_at = ${now(ctx)} where id = ${hook.id} and disabled_at is null`;
      throw new DomainError("closed", "This link is off.");
    }

    const questions = cleanWebhookQuestions(hook.questions);
    const { table, mapping } = tableFromFormAnswers(questions, parsed.answers);
    const suggested = withSuggestedAnswers(mapping, table, state.components);
    const progress = progressOf(state);
    const uncovered = new Map(progress.components.map((c) => [c.componentId, c.uncovered]));
    const existingRows = await tx`
      select source_row_id from pledges
      where commitment_id = ${state.commitment.id} and import_source = 'google_forms_webhook'
    `;
    const existing = new Set(existingRows.map((r) => r.sourceRowId as string));
    const planned = planImport({ table, mapping: suggested, components: state.components, uncovered, existing });
    const create: { sourceRowId: string; componentId: string; quantity: number; guestName: string; guestEmail: string | null; note: string }[] = [];
    for (const row of planned.create) {
      const sourceRowId = `${parsed.responseId}:${row.componentId}`;
      if (existing.has(sourceRowId)) {
        planned.duplicates.push({ rowNumber: row.rowNumber, componentId: row.componentId, quantity: row.quantity, guestName: row.guestName });
        continue;
      }
      create.push({ ...row, sourceRowId });
    }
    const summary = {
      created: create.length,
      quantity: create.reduce((sum, p) => sum + p.quantity, 0),
      overCap: planned.overCap.length,
    };
    await tx`update form_webhooks set last_used_at = ${now(ctx)} where id = ${hook.id}`;
    if (create.length === 0) return summary;

    const batchId = newId();
    const actor = hook.createdBy as string;
    await tx`
      insert into import_batches ${tx({
        id: batchId,
        commitmentId: state.commitment.id,
        source: "google_forms_webhook",
        fileName: "Google Form",
        createdCount: create.length,
        skippedCount: planned.duplicates.length + planned.overCap.length + planned.errors.length + planned.skipped.length,
        createdBy: actor,
      })}
    `;
    await tx`insert into pledges ${tx(
      create.map((p) => ({
        id: newId(),
        commitmentId: state.commitment.id,
        componentId: p.componentId,
        userId: null,
        guestName: p.guestName,
        guestEmail: p.guestEmail,
        importSource: "google_forms_webhook",
        sourceRowId: p.sourceRowId,
        importBatchId: batchId,
        quantity: p.quantity,
        note: p.note,
      })),
    )}`;
    await logActivity(tx, {
      kind: "pledges.imported",
      audience: "group",
      actorId: actor,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { source: "google_forms_webhook", count: summary.created, quantity: summary.quantity, overCap: summary.overCap, duplicates: planned.duplicates.length },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return summary;
  });
}
