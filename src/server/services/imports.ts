// Importing sign-ups (Google Forms, SignUpGenius, any spreadsheet) into a
// drive as guest pledges. The coordinator previews first; confirming runs the
// same plan again with the drive locked, so what's created matches what the
// numbers allow at that moment, and the whole import happens or none of it.

import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import {
  IMPORT_LIMITS,
  answerOptions,
  detectSource,
  guessMapping,
  mappingProblem,
  parseCsv,
  planImport,
  validateTable,
  withSuggestedAnswers,
  type CsvTable,
  type ImportMapping,
  type ImportPlan,
  type ImportSource,
} from "@/domain/import";
import type { Tx } from "../db/client";
import { assertInvariants, isUuid, loadDriveState, logActivity, mutate, newId, progressOf, read, requireRole, requireUser, type DriveState, type ServiceContext } from "./core";

const SOURCES: ImportSource[] = ["google_forms_csv", "signupgenius_csv", "spreadsheet"];

export interface ImportPreview {
  source: ImportSource;
  headers: string[];
  sampleRows: string[][];
  rowCount: number;
  mapping: ImportMapping;
  answers: ReturnType<typeof answerOptions>;
  components: { id: string; name: string; uncovered: number }[];
  plan: ImportPlan;
  problem: string | null;
}

function readTable(csv: string): CsvTable {
  if (typeof csv !== "string" || csv.trim() === "") {
    throw new DomainError("invalid_input", "Choose a CSV file to import.", { fieldErrors: { file: "Choose a CSV file" } });
  }
  if (csv.length > IMPORT_LIMITS.bytes) {
    throw new DomainError("invalid_input", "That file is over 1 MB. Split it into smaller files.", { fieldErrors: { file: "File is too large" } });
  }
  const table = parseCsv(csv);
  const problem = validateTable(table);
  if (problem) throw new DomainError("invalid_input", problem, { fieldErrors: { file: problem } });
  return table;
}

// Only the parts of a mapping we expect, with indexes inside the table.
function cleanMapping(raw: unknown, table: CsvTable, state: DriveState): ImportMapping | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const col = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < table.headers.length ? v : null);
  const componentIds = new Set(state.components.map((c) => c.id));
  const itemColumns: Record<string, string> = {};
  for (const [k, v] of Object.entries((m.itemColumns as Record<string, unknown>) ?? {})) {
    if (col(Number(k)) !== null && typeof v === "string" && componentIds.has(v)) itemColumns[k] = v;
  }
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries((m.answers as Record<string, unknown>) ?? {}).slice(0, 500)) {
    if (typeof v === "string" && (v === "skip" || componentIds.has(v))) answers[k.slice(0, 200)] = v;
  }
  return {
    name: col(m.name),
    firstName: col(m.firstName),
    lastName: col(m.lastName),
    email: col(m.email),
    item: col(m.item),
    quantity: col(m.quantity),
    comments: col(m.comments),
    timestamp: col(m.timestamp),
    itemColumns,
    answers,
    keepEmails: m.keepEmails === true,
  };
}

async function existingRowIds(tx: Tx, commitmentId: string, source: ImportSource) {
  const rows = await tx`
    select source_row_id from pledges where commitment_id = ${commitmentId} and import_source = ${source}
  `;
  return new Set(rows.map((r) => r.sourceRowId as string));
}

function requireOpenDrive(state: DriveState) {
  if (state.commitment.status !== "active") throw new DomainError("closed", "This drive was withdrawn, so you can't import sign-ups.");
  if (!acceptsDeliveries(state.request.status)) {
    throw new DomainError("closed", "The organization cancelled this request, so you can't import sign-ups.");
  }
}

function buildPlan(state: DriveState, table: CsvTable, mapping: ImportMapping, existing: Set<string>) {
  const progress = progressOf(state);
  const uncovered = new Map(progress.components.map((c) => [c.componentId, c.uncovered]));
  return {
    uncovered,
    plan: planImport({ table, mapping, components: state.components, uncovered, existing }),
  };
}

export async function previewImport(
  ctx: ServiceContext,
  input: { commitmentId: string; csv: string; mapping?: unknown; source?: unknown },
): Promise<ImportPreview> {
  const userId = requireUser(ctx);
  if (!isUuid(input.commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
  const table = readTable(input.csv);
  return read(ctx, async (tx) => {
    const state = await loadDriveState(tx, input.commitmentId, { lock: false });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can import sign-ups.");
    requireOpenDrive(state);
    const source = SOURCES.includes(input.source as ImportSource) ? (input.source as ImportSource) : detectSource(table.headers);
    const mapping = withSuggestedAnswers(
      cleanMapping(input.mapping, table, state) ?? guessMapping(table.headers, state.components),
      table,
      state.components,
    );
    const { plan, uncovered } = buildPlan(state, table, mapping, await existingRowIds(tx, state.commitment.id, source));
    return {
      source,
      headers: table.headers,
      sampleRows: table.rows.slice(0, 3).map((r) => table.headers.map((_, i) => (r[i] ?? "").slice(0, 80))),
      rowCount: table.rows.length,
      mapping,
      answers: answerOptions(table, mapping, state.components),
      components: state.components.map((c) => ({ id: c.id, name: c.name, uncovered: uncovered.get(c.id) ?? 0 })),
      plan,
      problem: mappingProblem(mapping),
    };
  });
}

export async function importPledges(
  ctx: ServiceContext,
  input: { commitmentId: string; csv: string; mapping: unknown; source: unknown; fileName?: string; idempotencyKey?: string },
) {
  return mutate(ctx, { action: "pledge.import", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    if (!isUuid(input.commitmentId)) throw new DomainError("not_found", "That drive doesn't exist.");
    const table = readTable(input.csv);
    const state = await loadDriveState(tx, input.commitmentId, { lock: true });
    await requireRole(tx, state.commitment.groupId, userId, "admin", "Only the drive's coordinators can import sign-ups.");
    requireOpenDrive(state);
    if (!SOURCES.includes(input.source as ImportSource)) throw new DomainError("invalid_input", "Choose where the file came from.");
    const source = input.source as ImportSource;
    const mapping = cleanMapping(input.mapping, table, state);
    if (!mapping) throw new DomainError("invalid_input", "Match the columns before importing.");
    const problem = mappingProblem(mapping);
    if (problem) throw new DomainError("invalid_input", problem);

    const { plan } = buildPlan(state, table, mapping, await existingRowIds(tx, state.commitment.id, source));
    const summary = {
      created: plan.create.length,
      duplicates: plan.duplicates.length,
      overCap: plan.overCap.length,
      errors: plan.errors.length,
      skipped: plan.skipped.length,
      quantity: plan.create.reduce((sum, p) => sum + p.quantity, 0),
    };
    if (plan.create.length === 0) return { batchId: null, ...summary };

    const batchId = newId();
    const fileName = (input.fileName ?? "").replace(/[\\/]/g, "").trim().slice(0, 200);
    await tx`
      insert into import_batches ${tx({
        id: batchId,
        commitmentId: state.commitment.id,
        source,
        fileName,
        createdCount: plan.create.length,
        skippedCount: plan.duplicates.length + plan.overCap.length + plan.errors.length + plan.skipped.length,
        createdBy: userId,
      })}
    `;
    const rows = plan.create.map((p) => ({
      id: newId(),
      commitmentId: state.commitment.id,
      componentId: p.componentId,
      userId: null,
      guestName: p.guestName,
      guestEmail: p.guestEmail,
      importSource: source,
      sourceRowId: p.sourceRowId,
      importBatchId: batchId,
      quantity: p.quantity,
      note: p.note,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      await tx`insert into pledges ${tx(rows.slice(i, i + 200))}`;
    }
    await logActivity(tx, {
      kind: "pledges.imported",
      audience: "group",
      actorId: userId,
      requestId: state.request.id,
      commitmentId: state.commitment.id,
      workspaceId: state.commitment.groupId,
      data: { source, count: summary.created, quantity: summary.quantity, overCap: summary.overCap, duplicates: summary.duplicates },
    });
    await assertInvariants(tx, state.request.id, state.commitment.id);
    return { batchId, ...summary };
  });
}
