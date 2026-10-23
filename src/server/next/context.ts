// Works out, once per request, who is acting and which data they act on:
// the real app (Supabase Auth user, "kitgap" schema) or a visitor's demo
// sandbox (sample persona, that visitor's private schema).

import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, LIVE_SCHEMA } from "../db/client";
import { DEMO_COOKIE, DEMO_PERSONA_COOKIE, personaFor, sandboxExists, schemaFor, verifySandboxCookie, type Persona } from "../demo/sandbox";
import type { ServiceContext } from "../services/core";
import { ensureProfile } from "../services/workspaces";
import { inSchema } from "../db/client";
import { createSupabaseServerClient, hasAuthCookie } from "./supabase";

export const DEMO_HEADER = "x-kitgap-demo";

export interface AppUser {
  id: string;
  displayName: string;
  email: string | null;
}

export interface AppContext extends ServiceContext {
  mode: "live" | "demo";
  // Prefix for every internal link: "" in the real app, "/demo" in the demo.
  base: "" | "/demo";
  user: AppUser | null;
  // True when the browser still has an auth cookie but the session is no longer valid.
  sessionExpired: boolean;
  demo: { sandboxId: string; persona: Persona } | null;
}

export const getAppContext = cache(async (): Promise<AppContext> => {
  const requestHeaders = await headers();
  if (requestHeaders.get(DEMO_HEADER) === "1") return demoContext();
  return liveContext();
});

async function liveContext(): Promise<AppContext> {
  const sql = db();
  const base = { sql, schema: LIVE_SCHEMA, mode: "live" as const, base: "" as const, demo: null };
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);
  if (!hasAuthCookie(cookieNames)) {
    return { ...base, userId: null, user: null, sessionExpired: false };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const authUser = data?.user;
  if (error || !authUser) {
    return { ...base, userId: null, user: null, sessionExpired: true };
  }
  const fallbackName =
    (authUser.user_metadata?.display_name as string | undefined) ?? authUser.email?.split("@")[0] ?? "KitGap member";
  const displayName = await inSchema(sql, LIVE_SCHEMA, async (tx) => {
    const [profile] = await tx`select display_name from profiles where id = ${authUser.id}`;
    if (profile) return profile.displayName as string;
    await ensureProfile(tx, authUser.id, fallbackName);
    return fallbackName;
  });
  return {
    ...base,
    userId: authUser.id,
    user: { id: authUser.id, displayName, email: authUser.email ?? null },
    sessionExpired: false,
  };
}

async function demoContext(): Promise<AppContext> {
  const sql = db();
  const cookieStore = await cookies();
  const sandboxId = verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value);
  const valid = sandboxId ? await sandboxExists(sql, sandboxId) : false;
  if (!sandboxId || !valid) {
    // No sandbox yet, or it was cleaned up after a day unused. Never fall
    // back to real data: send the visitor to the demo start page.
    redirect(sandboxId ? "/demo?expired=1" : "/demo");
  }
  const persona = personaFor(cookieStore.get(DEMO_PERSONA_COOKIE)?.value);
  return {
    sql,
    schema: schemaFor(sandboxId),
    mode: "demo",
    base: "/demo",
    userId: persona.userId,
    user: { id: persona.userId, displayName: persona.name, email: null },
    sessionExpired: false,
    demo: { sandboxId, persona },
  };
}

