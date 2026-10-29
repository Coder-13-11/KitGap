import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG 2.2 A/AA checks with axe-core on the main screens, in the
// demo (so every screen has data). axe only catches some problems, so this
// doesn't replace testing with a keyboard and a screen reader.

const ORG = "00000000-0000-4000-8000-00000000b001";
const REQUEST = "00000000-0000-4000-8000-00000000c001";

// Scan settled pages: an element caught mid-animation can measure too small.
test.use({ reducedMotion: "reduce" });

async function scan(page: Page, label: string) {
  // Next.js streams the <title> after the first bytes of the page.
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.length}x – ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

async function actAs(page: Page, persona: string, name: string) {
  // The person switcher sits in the demo bar's "All steps" panel.
  await page.getByText("All steps", { exact: true }).click();
  await page.getByLabel("Act as").selectOption(persona);
  await page.getByRole("button", { name: "Switch" }).click();
  await expect(page.getByRole("button", { name }).first()).toBeVisible();
}

test("public pages have no automatically detectable WCAG A/AA problems", async ({ page }) => {
  for (const path of ["/", "/requests", "/about", "/sign-in", "/sign-up", "/forgot-password", "/demo"]) {
    await page.goto(path);
    await scan(page, path);
  }
});

test("signed-in screens in the demo have no automatically detectable WCAG A/AA problems", async ({ page }) => {
  await page.goto("/demo");
  const start = page.getByRole("button", { name: "Start the demo" });
  if (await start.isVisible()) await start.click();
  else {
    await page.getByRole("button", { name: "Reset the demo" }).click();
    await page.getByRole("button", { name: "Go as Jordan" }).first().click();
  }
  await page.waitForURL(/\/demo\/requests\//);
  await scan(page, "request detail");

  await page.getByRole("button", { name: /I'll help with 20 kits/ }).click();
  await page.waitForURL(/adopt/);
  await scan(page, "adopt");
  await page.getByRole("button", { name: "Help with 20 kits" }).click();
  await page.waitForURL(/\/demo\/drives\//);
  await scan(page, "drive (coordinator)");
  const drive = new URL(page.url()).pathname;

  // A form with errors.
  const record = page.getByRole("form", { name: "Record received supplies" });
  await record.getByRole("button", { name: "Record received supplies" }).click();
  await expect(page.getByText("There is a problem").first()).toBeVisible();
  await scan(page, "drive with form errors");

  await page.goto("/demo/drives");
  await scan(page, "my drives");
  await page.goto(drive.replace("/drives/", "/d/"));
  await scan(page, "public drive");
  await page.goto("/demo/record/group/00000000-0000-4000-8000-00000000b002");
  await scan(page, "group record");
  await page.goto(`/demo/record/organization/${ORG}`);
  await scan(page, "organization record");

  await actAs(page, "organization", "Maya Ortiz");
  await page.goto(`/demo/organization/${ORG}`);
  await scan(page, "organization");
  await page.goto(`/demo/organization/${ORG}/requests/${REQUEST}`);
  await scan(page, "manage request");
  await page.goto(`/demo/organization/${ORG}/requests/new`);
  await scan(page, "new request");

  await actAs(page, "reviewer", "Riley Chen");
  await page.goto("/demo/admin");
  await scan(page, "review queue");
});
