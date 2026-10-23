import { expect, test } from "@playwright/test";
import { latestLink, makeReviewer, signIn, signUpAndConfirm, uniqueEmail } from "./helpers";

// The real, signed-in path with Supabase Auth (not the demo): accounts are
// created and confirmed by email, a reviewer approves the request, and a
// second person adopts part of it after being sent through sign-in.

const PASSWORD = "correct-horse-42";

test("organization posts a request, reviewer approves it, a coordinator adopts after signing up", async ({ browser }) => {
  const orgContext = await browser.newContext();
  const org = await orgContext.newPage();
  const managerEmail = uniqueEmail("manager");
  const title = `Hygiene kits for a family shelter ${Date.now()}`;

  // 1. A new organization manager signs up, confirms by email and registers.
  await signUpAndConfirm(org, "Ana Manager", managerEmail, PASSWORD);
  await org.goto("/organization/new");
  await org.getByLabel("Organization name").fill("Test Family Shelter");
  await org.getByLabel("City or area").fill("Kissimmee, FL");
  await org.getByLabel("Contact person").fill("Ana Manager");
  await org.getByLabel("Work email").fill(managerEmail);
  await org.getByRole("button", { name: "Register organization" }).click();
  await org.waitForURL(/\/organization\/[0-9a-f-]+\?created=1/);
  const orgPath = new URL(org.url()).pathname;

  // 2. The request form: step errors, duplicate items, computed preview, review.
  await org.getByRole("link", { name: "New request" }).click();
  await org.getByRole("button", { name: "Save and continue" }).click();
  await expect(org.getByText("Enter a title of at least 5 characters").first()).toBeVisible();
  await org.getByLabel("Request title").fill(title);
  await org.getByLabel("What's the need?").fill("Families arriving at the shelter often have no basic hygiene supplies for the first week.");
  await org.getByLabel("Who will this help?").fill("Families staying at our shelter");
  await org.getByLabel("Category").selectOption("hygiene");
  await org.getByRole("button", { name: "Save and continue" }).click();
  await expect(org.getByRole("heading", { name: "Step 2 of 4: What's needed" })).toBeVisible();
  await expect(org.getByText(/Draft saved at/)).toBeVisible();

  await org.getByLabel("What do you call one kit?").fill("hygiene kit");
  await org.getByLabel("How many hygiene kits do you need?").fill("50");
  await org.getByLabel("Item 1", { exact: true }).fill("Toothbrush");
  await org.getByRole("button", { name: "Add an item" }).click();
  await org.getByLabel("Item 2", { exact: true }).fill("toothbrushes");
  await org.getByRole("button", { name: "Save and continue" }).click();
  await expect(org.getByText(/“toothbrushes” is already listed as item 1/).first()).toBeVisible();
  await org.getByLabel("Item 2", { exact: true }).fill("Bar of soap");
  await org.getByLabel("Per hygiene kit").nth(1).fill("2");
  await expect(org.getByText("50 hygiene kits require 50 toothbrushes and 100 bars of soap in total.")).toBeVisible();
  await org.getByRole("button", { name: "Save and continue" }).click();

  await expect(org.getByRole("heading", { name: "Step 3 of 4: When and where" })).toBeVisible();
  const needed = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  await org.getByLabel("Needed by").fill(needed);
  await org.getByLabel("Handover instructions").fill("Front desk, Suite 4. Ring the bell.");
  await org.getByLabel("Link to your own fundraising page").fill("javascript:alert(1)");
  await org.getByRole("button", { name: "Save and continue" }).click();
  await expect(org.getByText("The link must start with https://").first()).toBeVisible();
  await org.getByLabel("Link to your own fundraising page").fill("");
  await org.getByRole("button", { name: "Save and continue" }).click();
  await expect(org.getByRole("heading", { name: "Step 4 of 4: Review" })).toBeVisible();
  await expect(org.getByText("50 toothbrushes")).toBeVisible();
  await org.getByRole("button", { name: "Submit for review" }).click();
  await org.waitForURL(/\/requests\/[0-9a-f-]+\?submitted=1/);
  await expect(org.getByText("Submitted for review")).toBeVisible();
  const requestId = new URL(org.url()).pathname.split("/").pop()!;

  // A request under review is not public.
  const visitor = await browser.newPage();
  await visitor.goto(`/requests/${requestId}`);
  await expect(visitor.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();

  // 3. A KitGap reviewer (granted with SQL, never through the UI) approves it.
  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  const reviewerEmail = uniqueEmail("reviewer");
  await signUpAndConfirm(reviewer, "Rae Reviewer", reviewerEmail, PASSWORD);
  await reviewer.goto("/admin");
  await expect(reviewer.getByRole("heading", { name: "Only KitGap reviewers can see this page" })).toBeVisible();
  await makeReviewer(reviewerEmail);
  await reviewer.reload();
  const card = reviewer.locator("li", { hasText: title });
  await card.getByRole("button", { name: "Approve and publish" }).click();
  await expect(reviewer.locator("li", { hasText: title })).toHaveCount(0);

  // 4. A visitor picks a quantity, is sent through sign-up, and returns to adopt.
  await visitor.goto(`/requests/${requestId}`);
  await expect(visitor.getByRole("heading", { name: title })).toBeVisible();
  await expect(visitor.getByText("Front desk, Suite 4")).toHaveCount(0); // private handover details
  await visitor.getByLabel("How many hygiene kits can your group take on?").fill("20");
  await visitor.getByRole("button", { name: "Start a drive for 20 hygiene kits" }).click();
  await visitor.waitForURL(/\/sign-in\?next=/);
  await expect(visitor.getByText("Sign in to start a drive.")).toBeVisible();
  const next = new URL(visitor.url()).searchParams.get("next")!;
  expect(next).toBe(`/requests/${requestId}/adopt?quantity=20`);

  const coordEmail = uniqueEmail("coordinator");
  await signUpAndConfirm(visitor, "Cam Coordinator", coordEmail, PASSWORD, next);
  await visitor.getByRole("link", { name: "Continue" }).click();
  await visitor.waitForURL(new RegExp(`/requests/${requestId}/adopt\\?quantity=20`));
  await expect(visitor.getByLabel("How many hygiene kits will your group provide?")).toHaveValue("20");
  await visitor.getByLabel("Group name").fill("Osceola Robotics Club");
  await visitor.getByLabel("City or area").fill("St. Cloud, FL");
  await visitor.getByRole("button", { name: "Confirm and start the drive" }).click();
  await visitor.waitForURL(/\/drives\/[0-9a-f-]+\?started=1/);
  await expect(visitor.getByText("20 hygiene kits are reserved for Osceola Robotics Club")).toBeVisible();
  await expect(visitor.getByText("Front desk, Suite 4")).toBeVisible(); // now visible to the coordinator

  // 5. Another session (the organization) sees the persisted state.
  await org.goto(orgPath);
  await expect(org.getByText("50 hygiene kits requested · 20 promised · 0 received")).toBeVisible();

  // 6. An expired session is reported clearly and keeps the person's entries.
  const cookies = await visitor.context().cookies();
  const auth = cookies.filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  expect(auth.length).toBeGreaterThan(0);
  await visitor.context().clearCookies();
  await visitor.context().addCookies(auth.map((c) => ({ ...c, value: "base64-eyJleHBpcmVkIjp0cnVlfQ" })));
  await visitor.goto(`/requests/${requestId}`);
  await visitor.goto("/drives");
  await visitor.waitForURL(/\/sign-in/);
  await expect(visitor.getByText("Your session expired")).toBeVisible();

  // 7. Password reset by email, then sign in with the new password.
  await visitor.context().clearCookies();
  await visitor.goto("/forgot-password");
  await visitor.getByLabel("Email address").fill(coordEmail);
  await visitor.getByRole("button", { name: "Send reset link" }).click();
  await expect(visitor.getByText("Check your email")).toBeVisible();
  const resetLink = await latestLink(coordEmail, "type=recovery");
  await visitor.goto(resetLink);
  await visitor.waitForURL(/\/reset-password/);
  await visitor.getByLabel("New password").fill("a-new-password-77");
  await visitor.getByRole("button", { name: "Save new password" }).click();
  await visitor.waitForURL(/\/account\?updated=password/);
  await visitor.context().clearCookies();
  await signIn(visitor, coordEmail, "a-new-password-77");
  await visitor.goto("/drives");
  await expect(visitor.getByRole("link", { name: title })).toBeVisible();

  await orgContext.close();
  await reviewerContext.close();
});

test("sign-in works with the keyboard alone and explains a wrong password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").focus();
  await page.keyboard.type("nobody@example.com");
  await page.keyboard.press("Tab");
  await page.keyboard.type("wrong-password-1");
  await page.keyboard.press("Enter");
  const summary = page.getByRole("heading", { name: "There is a problem" });
  await expect(summary).toBeVisible();
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  // Focus moved to the error summary so keyboard and screen-reader users land on it.
  await expect(page.locator("[aria-labelledby=error-summary-title]")).toBeFocused();
  await expect(page.getByLabel("Email address")).toHaveValue("nobody@example.com");
});
