"use server";

// Starting, resetting and leaving the demo, and switching which sample person
// you're acting as. None of this touches real data: it only manages the
// visitor's own sandbox schema and two cookies.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { dropSchema } from "@/server/db/migrations";
import {
  DEMO_COOKIE,
  DEMO_PERSONA_COOKIE,
  createSandbox,
  personaFor,
  schemaFor,
  signSandboxId,
  verifySandboxCookie,
} from "@/server/demo/sandbox";
import { safeDemoPath } from "@/lib/safe-next";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24,
};

export async function startDemoAction(formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  const existing = verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value);
  const sandboxId = await createSandbox(db(), existing ?? undefined);
  const persona = personaFor(String(formData.get("persona") ?? "coordinator"));
  cookieStore.set(DEMO_COOKIE, signSandboxId(sandboxId), COOKIE_OPTIONS);
  cookieStore.set(DEMO_PERSONA_COOKIE, persona.key, COOKIE_OPTIONS);
  redirect(`/demo${persona.home}`);
}

export async function switchPersonaAction(formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  if (!verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value)) redirect("/demo");
  const persona = personaFor(String(formData.get("persona") ?? ""));
  cookieStore.set(DEMO_PERSONA_COOKIE, persona.key, COOKIE_OPTIONS);
  const next = safeDemoPath(String(formData.get("next") ?? ""));
  redirect(`/demo${next ?? persona.home}`);
}

export async function resetDemoAction(): Promise<void> {
  const cookieStore = await cookies();
  const existing = verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value);
  const sandboxId = await createSandbox(db(), existing ?? undefined);
  cookieStore.set(DEMO_COOKIE, signSandboxId(sandboxId), COOKIE_OPTIONS);
  redirect("/demo?reset=1");
}

export async function exitDemoAction(): Promise<void> {
  const cookieStore = await cookies();
  const existing = verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value);
  if (existing) {
    const sql = db();
    await dropSchema(sql, schemaFor(existing));
    await sql`delete from kitgap_meta.demo_sandboxes where schema_name = ${schemaFor(existing)}`;
  }
  cookieStore.delete(DEMO_COOKIE);
  cookieStore.delete(DEMO_PERSONA_COOKIE);
  redirect("/");
}
