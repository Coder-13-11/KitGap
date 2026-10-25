"use server";

// Kit the assistant: a fresh snapshot for the floating helper, and answers
// to questions. Everything is read again from the database on each call.

import type { KitTurn } from "@/server/kit/ai";
import { loadAssistant, type AssistantSnapshot } from "@/server/kit/assistant";
import { askAssistant, type AssistantReply } from "@/server/kit/assistant-ai";
import { getAppContext } from "@/server/next/context";

const PER_MINUTE = 20;
const recent = new Map<string, number[]>();

function allowed(key: string): boolean {
  const now = Date.now();
  const times = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= PER_MINUTE) return false;
  times.push(now);
  recent.set(key, times);
  return true;
}

export type KitSnapshotView = Pick<AssistantSnapshot, "signedIn" | "firstName" | "nudges" | "myNeeds" | "pageNeed">;

export async function kitSnapshotAction(path: string): Promise<KitSnapshotView | null> {
  try {
    const s = await loadAssistant(await getAppContext(), String(path).slice(0, 300));
    return { signedIn: s.signedIn, firstName: s.firstName, nudges: s.nudges, myNeeds: s.myNeeds, pageNeed: s.pageNeed };
  } catch {
    return null;
  }
}

export async function askKitAssistantAction(input: { question: string; path: string; history: KitTurn[] }): Promise<AssistantReply | { error: string }> {
  const ctx = await getAppContext();
  const question = String(input.question ?? "").trim().slice(0, 500);
  if (!question) return { error: "Ask me anything about KitGap." };
  if (!allowed(ctx.user?.id ?? `anon-${ctx.demo?.sandboxId ?? "live"}`)) return { error: "That's a lot of questions at once. Give me a minute." };
  const snapshot = await loadAssistant(ctx, String(input.path ?? "/").slice(0, 300));
  const history = (Array.isArray(input.history) ? input.history : [])
    .filter((t) => t && (t.from === "me" || t.from === "kit") && typeof t.text === "string")
    .slice(-6);
  return askAssistant(snapshot, question, history);
}
