"use server";

// Asking Kit a question about a need. Kit's facts are loaded again here from
// the database; the browser only sends the question.

import { routeQuestion, type KitIntent } from "@/domain/kit-helper";
import { askKit, type KitReply, type KitTurn } from "@/server/kit/ai";
import { loadKitContext } from "@/server/kit/input";
import { getAppContext } from "@/server/next/context";

const INTENTS: KitIntent[] = ["why", "instagram", "partners", "email", "stats"];
const PER_MINUTE = 15;
const recent = new Map<string, number[]>();

function allowed(userId: string): boolean {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= PER_MINUTE) return false;
  times.push(now);
  recent.set(userId, times);
  return true;
}

export async function askKitAction(input: {
  requestId: string;
  question: string;
  intent: KitIntent | null;
  history: KitTurn[];
}): Promise<KitReply | { error: string }> {
  const ctx = await getAppContext();
  if (!ctx.user) return { error: "Sign in again to ask Kit." };
  if (!allowed(ctx.user.id)) return { error: "That's a lot of questions at once. Wait a minute and ask again." };
  const kit = await loadKitContext(ctx, String(input.requestId));
  if (!kit) return { error: "Kit can only help the people running this need." };

  const question = String(input.question ?? "").slice(0, 500);
  const intent = INTENTS.includes(input.intent as KitIntent) ? (input.intent as KitIntent) : routeQuestion(question);
  const history = (Array.isArray(input.history) ? input.history : [])
    .filter((t) => t && (t.from === "me" || t.from === "kit") && typeof t.text === "string")
    .slice(-6);
  return askKit(kit.input, kit.nearbyOrgs, question, intent, history);
}
