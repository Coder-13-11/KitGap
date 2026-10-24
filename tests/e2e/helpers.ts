import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

// Helpers for tests that use real Supabase Auth: confirmation emails are
// read from the local Mailpit inbox that `supabase start` runs.

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function latestLink(to: string, pathPart: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = (await res.json()) as { messages: { ID: string }[] };
    if (body.messages.length > 0) {
      const message = await (await fetch(`${MAILPIT}/api/v1/message/${body.messages[0].ID}`)).json();
      const html = String(message.HTML ?? message.Text ?? "");
      const match = html.match(new RegExp(`href="([^"]*${pathPart}[^"]*)"`));
      if (match) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email with a ${pathPart} link arrived for ${to}`);
}

export async function signUpAndConfirm(
  page: Page,
  name: string,
  email: string,
  password: string,
  nextPath?: string,
  role: "A school club or group" | "An organization" | "I was invited" = "A school club or group",
) {
  await page.goto(`/sign-up${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  // Invitation links skip the "What brings you here?" step.
  if (!nextPath?.startsWith("/join/")) {
    await page.getByRole("radio", { name: new RegExp(`^${role}`) }).check();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Create a password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/check-email/);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const link = await latestLink(email, "/auth/confirm");
  await page.goto(link);
  await page.waitForURL(/\/welcome/);
  await expect(page.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

// Reviewer access is granted with SQL by whoever runs KitGap; tests do the same.
export async function makeReviewer(email: string) {
  const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 1 });
  try {
    await sql`
      insert into kitgap.platform_admins (user_id)
      select id from auth.users where email = ${email}
      on conflict do nothing
    `;
  } finally {
    await sql.end();
  }
}

// Removes everything created by test accounts (emails ending @example.com).
// Refuses to run against anything but a local database.
export async function cleanupTestAccounts() {
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("Refusing to clean up test data outside a local database");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx`set local search_path to kitgap`;
      await tx`create temp table test_users on commit drop as select id from auth.users where email like '%@example.com'`;
      await tx`create temp table test_ws on commit drop as select id from workspaces where created_by in (select id from test_users)`;
      await tx`create temp table test_req on commit drop as select id from requests where org_id in (select id from test_ws)`;
      await tx`create temp table test_com on commit drop as
        select id from commitments where request_id in (select id from test_req) or group_id in (select id from test_ws)`;
      await tx`delete from activity where request_id in (select id from test_req) or commitment_id in (select id from test_com)
               or workspace_id in (select id from test_ws) or actor_id in (select id from test_users)`;
      for (const table of ["deliveries", "kit_movements", "collection_entries", "pledges"]) {
        await tx`delete from ${tx(table)} where commitment_id in (select id from test_com)`;
      }
      await tx`delete from commitments where id in (select id from test_com)`;
      await tx`update requests set copied_from = null where copied_from in (select id from test_req)`;
      await tx`delete from requests where id in (select id from test_req)`;
      await tx`delete from workspace_members where workspace_id in (select id from test_ws) or user_id in (select id from test_users)`;
      await tx`update workspaces set contact_confirmed_by = null where contact_confirmed_by in (select id from test_users)`;
      await tx`delete from workspaces where id in (select id from test_ws)`;
      await tx`delete from platform_admins where user_id in (select id from test_users)`;
      await tx`delete from idempotency_keys where user_id in (select id from test_users)`;
      await tx`delete from profiles where id in (select id from test_users)`;
      await tx`delete from auth.users where id in (select id from test_users)`;
    });
  } finally {
    await sql.end();
  }
}
