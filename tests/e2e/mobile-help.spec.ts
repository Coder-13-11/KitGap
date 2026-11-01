import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const ORG = "00000000-0000-4000-8000-00000000b001";
const REQUEST = "00000000-0000-4000-8000-00000000c001";
test.use({ reducedMotion: "reduce" });
async function start(page: Page) {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start the demo", exact: true }).click();
  await page.waitForURL(/\/demo\/requests\//);
}
async function fit(page: Page) {
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
}
async function scan(page: Page) {
  const results = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n=>n.target).join(", ")}`)).toEqual([]);
}
test("individual promise, ready, delivery and organization confirmation", async ({page}) => {
  await start(page);
  await fit(page);
  await page.getByRole("button",{name:"I’ll bring 1 kit",exact:true}).click();
  await page.waitForURL(/\/help\?quantity=1/);
  await expect(page.getByRole("heading",{name:"Your list for 1 kit"})).toBeVisible();
  await expect(page.getByLabel(/group name/i)).toHaveCount(0);
  await fit(page); await scan(page);
  await page.getByRole("button",{name:"Confirm my pledge",exact:true}).click();
  await page.waitForURL(/\/demo\/drives\//);
  const driveUrl=page.url().split("?")[0];
  await expect(page.getByRole("heading",{name:"Your small thing. Their next step."})).toBeVisible();
  await fit(page); await scan(page);
  await page.getByRole("checkbox",{name:/I have all the items/}).check();
  await page.getByRole("button",{name:"Ready to bring",exact:true}).click();
  await expect(page.getByRole("button",{name:"Report delivery",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Report delivery",exact:true}).click();
  await expect(page.getByText("Waiting for confirmation",{exact:true})).toBeVisible();
  await page.getByText("All steps",{exact:true}).click();
  await page.getByLabel("Act as").selectOption("organization");
  await page.getByRole("button",{name:"Switch",exact:true}).click();
  await page.waitForLoadState("networkidle");
  await page.goto(`/demo/organization/${ORG}`);
  await page.getByRole("link",{name:"Review delivery",exact:true}).click();
  await fit(page);
  await page.getByRole("button",{name:"Save decision",exact:true}).click();
  await page.waitForURL(/reviewed=/);
  await page.getByText("All steps",{exact:true}).click();
  await page.getByLabel("Act as").selectOption("coordinator");
  await page.getByRole("button",{name:"Switch",exact:true}).click();
  await page.waitForLoadState("networkidle");
  await page.goto(driveUrl);
  await expect(page.getByRole("heading",{name:"It arrived. Thank you."})).toBeVisible();
  await page.reload();
  await expect(page.getByText("Received by Riverbend Family Center (sample)",{exact:true})).toBeVisible();
});
test("noticeboard and filters fit small through large screens", async ({page}) => {
  await start(page);
  for(const width of [320,375,390,768,1440]) {
    await page.setViewportSize({width,height:844});
    await page.goto("/demo/requests");
    await expect(page.getByRole("heading",{level:1})).toContainText("Real help");
    await fit(page);
    await page.goto(`/demo/requests/${REQUEST}`);
    await fit(page);
  }
});
test("staff can post a need in three saved steps", async ({page}) => {
  await start(page);
  await page.getByText("All steps",{exact:true}).click();
  await page.getByLabel("Act as").selectOption("organization");
  await page.getByRole("button",{name:"Switch",exact:true}).click();
  await page.waitForLoadState("networkidle");
  await page.goto(`/demo/organization/${ORG}/requests/new?template=school`);
  await expect(page.getByLabel("Request title",{exact:true})).toHaveValue("School-supply kits for students");
  await fit(page);
  await page.getByRole("button",{name:"Save and continue",exact:true}).click();
  await expect(page.getByLabel("Needed by",{exact:true})).toBeVisible();
  await fit(page);
  await page.getByRole("button",{name:"Save and continue",exact:true}).click();
  await expect(page.getByRole("button",{name:"Submit for review",exact:true})).toBeVisible();
  await fit(page); await scan(page);
  await page.getByRole("button",{name:"Submit for review",exact:true}).click();
  await page.waitForURL(/\/requests\/[0-9a-f-]+/);
  await expect(page.getByText(/Waiting for review|Submitted for review|In review/).first()).toBeVisible();
});
