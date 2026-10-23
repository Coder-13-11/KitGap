import { expect, test, type Page } from "@playwright/test";

// The full journey in the demo sandbox, as four different people:
// adopt 20 of 100 kits, pledge, record supplies, pack, deliver, review with a
// partial acceptance, follow up, and finish. Each step checks the numbers.

async function actAs(page: Page, persona: "organization" | "coordinator" | "contributor" | "reviewer", path: string) {
  const labels = { organization: "Maya Ortiz", coordinator: "Jordan Lee", contributor: "Sam Patel", reviewer: "Riley Chen" };
  await page.getByLabel("Acting as").selectOption(persona);
  await page.getByRole("button", { name: "Switch" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: labels[persona] })).toBeVisible();
  await page.goto(`/demo${path}`);
}

async function fill(page: Page, form: ReturnType<Page["locator"]>, label: string, value: string) {
  await form.getByLabel(label, { exact: true }).fill(value);
}

test("a drive from adoption to confirmed delivery", async ({ page }) => {
  await page.goto("/demo");
  if (await page.getByRole("button", { name: "Start the demo" }).isVisible()) {
    await page.getByRole("button", { name: "Start the demo" }).click();
  } else {
    await page.getByRole("button", { name: "Reset the demo" }).click();
    await page.getByRole("button", { name: "Go as Jordan" }).first().click();
  }
  await page.waitForURL(/\/demo\/requests\//);
  await expect(page.getByText("Demo with sample data.")).toBeVisible();
  const requestUrl = page.url();

  // 1. Jordan adopts 20 of 100 kits.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("School-supply kits for students starting mid-year");
  await page.getByLabel("How many kits can your group take on?").fill("20");
  await expect(page.locator("#quick-quantity-preview")).toContainText("40 notebooks");
  await page.getByRole("button", { name: "Start a drive for 20 kits" }).click();
  await page.waitForURL(/\/adopt/);
  await expect(page.getByRole("heading", { name: "Your supply list for 20 kits" })).toBeVisible();
  const supply = page.locator("#supply-preview");
  await expect(supply).toContainText("Backpack");
  await expect(supply).toContainText("40");
  await page.getByRole("button", { name: "Confirm and start the drive" }).click();
  await page.waitForURL(/\/demo\/drives\/[0-9a-f-]+\?started=1/);
  await expect(page.getByText("Your drive has started")).toBeVisible();
  const driveUrl = page.url().split("?")[0];
  const drivePath = new URL(driveUrl).pathname.replace(/^\/demo/, "");

  await page.goto(requestUrl);
  await expect(page.getByText("20 of 100 kits promised by groups; 0 confirmed received")).toBeVisible();
  await expect(page.getByText("Of 100 kits, 0 confirmed received, 0 delivered and awaiting review, 20 promised by groups and not yet delivered, and 80 still available for new drives.")).toBeAttached();
  await expect(page.getByRole("heading", { name: "Your group's drive" })).toBeVisible();

  // 2. Sam pledges 10 notebooks; it does not count as collected.
  await actAs(page, "contributor", drivePath);
  const pledgeForm = page.getByRole("form", { name: "Pledge supplies" });
  await pledgeForm.getByLabel("Item").selectOption({ label: "Notebook (40 still needed)" });
  await fill(page, pledgeForm, "How many will you bring?", "10");
  await pledgeForm.getByRole("button", { name: "Pledge these items" }).click();
  await expect(page.getByRole("status").getByText("You pledged 10 notebooks.", { exact: false })).toBeVisible();
  const notebookRow = page.locator("table").first().getByRole("row", { name: /Notebook/ });
  await expect(notebookRow).toContainText("40"); // needed
  await expect(notebookRow.getByRole("cell").nth(1)).toHaveText("0"); // collected
  await expect(notebookRow.getByRole("cell").nth(2)).toHaveText("10"); // pledged
  await expect(notebookRow.getByRole("cell").nth(3)).toHaveText("30"); // still needed

  // 3. Jordan records 20 backpacks, 30 notebooks (10 from the pledge), 20 pencil packs.
  await actAs(page, "coordinator", drivePath);
  const record = page.getByRole("form", { name: "Record received supplies" });
  await record.getByLabel("Item", { exact: true }).selectOption({ label: "Backpack" });
  await fill(page, record, "Usable", "20");
  await record.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByRole("status").getByText("Recorded 20 usable backpacks.", { exact: false })).toBeVisible();

  const record2 = page.getByRole("form", { name: "Record received supplies" });
  await record2.getByLabel("Is this from a pledge?").selectOption({ index: 1 });
  await fill(page, record2, "Usable", "10");
  await record2.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByRole("status").getByText("Recorded 10 usable notebooks.", { exact: false })).toBeVisible();

  const record3 = page.getByRole("form", { name: "Record received supplies" });
  await record3.getByLabel("Item", { exact: true }).selectOption({ label: "Notebook" });
  await fill(page, record3, "Usable", "20");
  await record3.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByRole("status").getByText("Recorded 20 usable notebooks.", { exact: false })).toBeVisible();

  const record4 = page.getByRole("form", { name: "Record received supplies" });
  await record4.getByLabel("Item", { exact: true }).selectOption({ label: "Pencil pack" });
  await fill(page, record4, "Usable", "20");
  await record4.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByRole("status").getByText("Recorded 20 usable pencil packs.", { exact: false })).toBeVisible();

  await expect(page.getByText("10 more notebooks complete the remaining 20 kits.")).toBeVisible();
  await expect(page.getByText("You can pack 15 kits now with what you have.")).toBeVisible();

  // Pack 15 and report a delivery of 15.
  const pack = page.getByRole("form", { name: "Record packed kits" });
  await expect(pack.getByLabel("How many complete kits did you pack?")).toHaveValue("15");
  await pack.getByRole("button", { name: "Record packed kits" }).click();
  await expect(page.getByRole("status").getByText("Recorded 15 kits packed and ready to hand over.")).toBeVisible();
  const deliver = page.getByRole("form", { name: "Report a delivery" });
  await expect(deliver.getByLabel("How many kits did you hand over?")).toHaveValue("15");
  await deliver.getByRole("button", { name: "Report delivery" }).click();
  await expect(page.getByRole("status").getByText("Reported a delivery of 15 kits.", { exact: false })).toBeVisible();
  await expect(page.getByText("Awaiting Riverbend Family Center (sample)'s review").first()).toBeVisible();

  // 4. Maya accepts 13 and does not accept 2.
  await actAs(page, "organization", "/organization/00000000-0000-4000-8000-00000000b001");
  await expect(page.getByText("Lakeside High Service Club (sample) reported 15 kits")).toBeVisible();
  await page.getByRole("link", { name: "Review delivery" }).click();
  await page.getByLabel("No, only some (or none) are acceptable").check();
  await page.getByLabel("How many kits are you accepting?").fill("13");
  await expect(page.getByText("2 kits not accepted.")).toBeVisible();
  await page.getByRole("button", { name: "Save decision" }).click();
  // A missing explanation is caught and the entered number is kept.
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByLabel("How many kits are you accepting?")).toHaveValue("13");
  await page.getByLabel("What was wrong or missing?").fill("Two kits were missing pencil packs.");
  await page.getByRole("button", { name: "Save decision" }).click();
  await page.waitForURL(/reviewed=/);
  await expect(page.getByText("Decision saved")).toBeVisible();

  await page.goto(requestUrl);
  await expect(page.getByText("20 of 100 kits promised by groups; 13 confirmed received")).toBeVisible();

  // 5. Jordan sees the decision in Updates, then follows up and finishes.
  await actAs(page, "coordinator", "/updates");
  await expect(page.getByText("accepted 13 of 15 kits from Lakeside High Service Club (sample); 2 not accepted", { exact: false })).toBeVisible();
  await page.goto(`/demo${drivePath}`);
  await expect(page.getByRole("heading", { name: "Decide what to do with 2 kits not accepted" })).toBeVisible();
  const fixed = page.getByRole("form", { name: "Mark fixed" });
  await fill(page, fixed, "Fixed kits", "2");
  await fixed.getByRole("button", { name: "Mark as ready again" }).click();
  await expect(page.getByRole("status").getByText("Marked 2 kits fixed and ready to hand over again.")).toBeVisible();

  const more = page.getByRole("form", { name: "Record received supplies" });
  await more.getByLabel("Item", { exact: true }).selectOption({ label: "Notebook" });
  await fill(page, more, "Usable", "10");
  await more.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByRole("status").getByText("Recorded 10 usable notebooks.", { exact: false })).toBeVisible();

  const pack2 = page.getByRole("form", { name: "Record packed kits" });
  await expect(pack2.getByLabel("How many complete kits did you pack?")).toHaveValue("5");
  await pack2.getByRole("button", { name: "Record packed kits" }).click();
  await expect(page.getByRole("status").getByText("Recorded 5 kits packed and ready to hand over.")).toBeVisible();
  const deliver2 = page.getByRole("form", { name: "Report a delivery" });
  await expect(deliver2.getByLabel("How many kits did you hand over?")).toHaveValue("7");
  await deliver2.getByRole("button", { name: "Report delivery" }).click();
  await expect(page.getByRole("status").getByText("Reported a delivery of 7 kits.", { exact: false })).toBeVisible();

  await actAs(page, "organization", "/organization/00000000-0000-4000-8000-00000000b001");
  await page.getByRole("link", { name: "Review delivery" }).click();
  await page.getByRole("button", { name: "Save decision" }).click();
  await page.waitForURL(/reviewed=/);

  await actAs(page, "coordinator", drivePath);
  await expect(page.getByRole("heading", { name: "Drive complete" })).toBeVisible();
  await page.goto(requestUrl);
  await expect(page.getByText("20 of 100 kits promised by groups; 20 confirmed received")).toBeVisible();
});
