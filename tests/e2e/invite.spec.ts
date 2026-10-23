import { expect, test } from "@playwright/test";
import { createSql, LIVE_SCHEMA } from "@/server/db/client";
import { adoptRequest } from "@/server/services/drives";
import { approveRequest, createRequestDraft, submitRequestForReview } from "@/server/services/requests";
import { createWorkspace, setContactConfirmed } from "@/server/services/workspaces";
import { addDays, todayIn } from "@/domain/dates";
import { EMPTY_REQUEST_INPUT } from "@/domain/request-input";
import { cleanupTestAccounts, makeReviewer, signUpAndConfirm, uniqueEmail } from "./helpers";

// A contributor receives an invitation link, isn't signed in, creates an
// account, confirms it by email, comes back to the invitation, joins the
// group and pledges. Setup data is created through the server services.

test.beforeAll(cleanupTestAccounts);
test.afterAll(cleanupTestAccounts);

test("a new contributor joins through an invitation link and pledges", async ({ browser }) => {
  const sql = createSql(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 2 });
  try {
    const coordPage = await (await browser.newContext()).newPage();
    const coordEmail = uniqueEmail("coord");
    await signUpAndConfirm(coordPage, "Casey Coordinator", coordEmail, "correct-horse-42");
    await makeReviewer(coordEmail); // same account plays organization, reviewer and coordinator here
    const [{ id: coordId }] = await sql`select id from auth.users where email = ${coordEmail}`;
    const ctx = { sql, schema: LIVE_SCHEMA, userId: coordId as string };

    const { workspaceId: orgId } = await createWorkspace(ctx, {
      kind: "organization",
      name: "Invite Test Pantry",
      city: "Kissimmee, FL",
      contactName: "Casey",
      contactEmail: coordEmail,
    });
    const fields = {
      ...EMPTY_REQUEST_INPUT,
      title: "Pencil packs for an invitation test",
      need: "Testing that invitations, sign-up and pledging work together end to end.",
      beneficiaries: "Students in a test program",
      requestType: "item",
      unitName: "Pencil pack",
      targetQuantity: "40",
      components: [{ name: "", quantityPerUnit: "1", details: "" }],
      neededBy: addDays(todayIn("America/New_York"), 14),
      location: "Kissimmee, FL",
    };
    const { requestId } = await createRequestDraft(ctx, { orgId, fields });
    await submitRequestForReview(ctx, { requestId, fields });
    await setContactConfirmed(ctx, { workspaceId: orgId, confirmed: true });
    await approveRequest(ctx, { requestId });
    const { commitmentId, groupId } = await adoptRequest(ctx, {
      requestId,
      newGroup: { name: "Invite Test Club", city: "Kissimmee, FL" },
      quantity: 10,
    });
    const [{ inviteToken }] = await sql`select invite_token from kitgap.workspaces where id = ${groupId}`;

    // The contributor, signed out, opens the invitation.
    const page = await (await browser.newContext()).newPage();
    await page.goto(`/join/${inviteToken}`);
    await page.waitForURL(/\/sign-in\?next=/);
    await expect(page.getByText("Sign in to accept the invitation.")).toBeVisible();
    const next = new URL(page.url()).searchParams.get("next")!;
    expect(next).toBe(`/join/${inviteToken}`);

    await signUpAndConfirm(page, "Robin Contributor", uniqueEmail("robin"), "correct-horse-42", next);
    await page.getByRole("link", { name: "Continue" }).click();
    await page.waitForURL(new RegExp(`/join/${inviteToken}`));
    await page.getByRole("button", { name: "Join Invite Test Club" }).click();
    await page.waitForURL(/\/groups\/.*joined=1/);
    await expect(page.getByText("You joined Invite Test Club")).toBeVisible();

    await page.getByRole("link", { name: "Pencil packs for an invitation test" }).click();
    const pledge = page.getByRole("form", { name: "Pledge supplies" });
    await pledge.getByLabel("How many will you bring?").fill("3");
    await pledge.getByRole("button", { name: "Pledge these items" }).click();
    await expect(page.getByRole("status").getByText("You pledged 3 pencil packs.", { exact: false })).toBeVisible();
    // A contributor can't record receipts.
    await expect(page.getByRole("form", { name: "Record received supplies" })).toHaveCount(0);

    // The coordinator sees who pledged.
    await coordPage.goto(`/drives/${commitmentId}`);
    await expect(coordPage.getByText("3 pencil packs from Robin Contributor")).toBeVisible();
  } finally {
    await sql.end();
  }
});
