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

export async function signUpAndConfirm(page: Page, name: string, email: string, password: string, nextPath?: string) {
  await page.goto(`/sign-up${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
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
