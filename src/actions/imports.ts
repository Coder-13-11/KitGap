"use server";

// Importing sign-ups into a drive. See src/server/services/imports.ts.

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/server/next/action";
import { importPledges, previewImport, type ImportPreview } from "@/server/services/imports";
import { connectFormWebhook, disableFormWebhook, saveWebhookQuestions } from "@/server/services/webhooks";
import { siteUrl } from "@/server/next/supabase";

export async function previewImportAction(input: {
  commitmentId: string;
  csv: string;
  mapping?: unknown;
  source?: string;
}): Promise<ActionResult<ImportPreview>> {
  return runAction((ctx) => previewImport(ctx, input));
}

export async function importPledgesAction(input: {
  commitmentId: string;
  csv: string;
  mapping: unknown;
  source: string;
  fileName: string;
  idempotencyKey: string;
}): Promise<ActionResult<Awaited<ReturnType<typeof importPledges>>>> {
  return runAction(async (ctx) => {
    const result = await importPledges(ctx, input);
    refresh();
    return result;
  });
}

export async function connectFormWebhookAction(input: {
  commitmentId: string;
  questions?: unknown;
}): Promise<ActionResult<{ url: string; questions: Awaited<ReturnType<typeof connectFormWebhook>>["questions"] }>> {
  return runAction(async (ctx) => {
    const result = await connectFormWebhook(ctx, input);
    refresh();
    return { url: `${siteUrl()}/api/hooks/forms/${result.secret}`, questions: result.questions };
  });
}

export async function saveWebhookQuestionsAction(input: {
  commitmentId: string;
  questions: unknown;
}): Promise<ActionResult<Awaited<ReturnType<typeof saveWebhookQuestions>>>> {
  return runAction(async (ctx) => {
    const questions = await saveWebhookQuestions(ctx, input);
    refresh();
    return questions;
  });
}

export async function disableFormWebhookAction(input: { commitmentId: string }): Promise<ActionResult<{ disabled: boolean }>> {
  return runAction(async (ctx) => {
    const result = await disableFormWebhook(ctx, input);
    refresh();
    return result;
  });
}
