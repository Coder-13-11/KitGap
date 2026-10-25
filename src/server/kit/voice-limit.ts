import "server-only";

// Who may use Kit's voice routes, and how often. Only signed-in people and
// demo visitors (with a validly signed sandbox cookie) can, so the AI key
// can't be used as a free speech service. Limits are per person or sandbox,
// kept in memory: they reset when the server restarts.

import { cookies } from "next/headers";
import { DEMO_COOKIE, verifySandboxCookie } from "../demo/sandbox";
import { getAppContext } from "../next/context";

const recent = new Map<string, number[]>();

/** "user:<id>" or "demo:<sandbox>" for someone allowed to use Kit's AI, otherwise null. */
export async function kitCaller(): Promise<string | null> {
  const sandbox = verifySandboxCookie((await cookies()).get(DEMO_COOKIE)?.value);
  if (sandbox) return `demo:${sandbox}`;
  const ctx = await getAppContext();
  return ctx.user ? `user:${ctx.user.id}` : null;
}

export function voiceAllowed(caller: string, perMinute = 20): boolean {
  const now = Date.now();
  const times = (recent.get(caller) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= perMinute) return false;
  times.push(now);
  recent.set(caller, times);
  if (recent.size > 5000) recent.clear();
  return true;
}
