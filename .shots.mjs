import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const widths = (process.argv[3] ?? "1440,390").split(",").map(Number);
const only = process.argv[4] ? process.argv[4].split(",") : null;
const base = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const NAMES = { organization: "Maya Ortiz", coordinator: "Jordan Lee", contributor: "Sam Patel", reviewer: "Riley Chen" };
const as = async (persona) => {
  await page.getByLabel("Acting as").selectOption(persona);
  await page.getByRole("button", { name: "Switch" }).click();
  await page.getByRole("button", { name: NAMES[persona] }).first().waitFor();
};
// Set up a drive in progress.
await page.goto(base + "/demo");
const start = page.getByRole("button", { name: "Start the demo" });
if (await start.isVisible()) await start.click(); else { await page.getByRole("button", { name: "Reset the demo" }).click(); await page.getByRole("button", { name: "Go as Jordan" }).first().click(); }
await page.waitForURL(/\/demo\/requests\//);
const requestUrl = page.url();
await page.getByRole("button", { name: /Start a drive for 20 kits/ }).click();
await page.waitForURL(/adopt/);
const adoptUrl = page.url();
await page.getByRole("button", { name: "Confirm and start the drive" }).click();
await page.waitForURL(/\/demo\/drives\//);
const driveUrl = page.url().split("?")[0];
await as("contributor"); await page.goto(driveUrl);
let f = page.getByRole("form", { name: "Pledge supplies" });
await f.getByLabel("Item").selectOption({ index: 1 }); await f.getByLabel("How many will you bring?").fill("10"); await f.getByRole("button", { name: "Pledge these items" }).click();
await page.getByRole("status").getByText("You pledged").waitFor();
await as("coordinator"); await page.goto(driveUrl); await page.getByRole("form", { name: "Record received supplies" }).waitFor();
for (const [item, n] of [["Backpack", "20"], ["Notebook", "20"], ["Pencil pack", "12"]]) {
  f = page.getByRole("form", { name: "Record received supplies" });
  await f.getByLabel("Item", { exact: true }).selectOption({ label: item }); await f.getByLabel("Usable", { exact: true }).fill(n); await f.getByRole("button", { name: "Record received supplies" }).click();
  try { await page.getByRole("status").getByText(`Recorded ${n} usable ${item.toLowerCase()}`).waitFor({ timeout: 8000 }); }
  catch (e) { console.log("FAILED", item, await page.locator("[aria-labelledby=error-summary-title]").allInnerTexts(), await page.getByRole("status").allInnerTexts()); throw e; }
}
f = page.getByRole("form", { name: "Record packed kits" }); await f.getByLabel(/How many complete kits/).fill("8"); await f.getByRole("button", { name: "Record packed kits" }).click();
await page.getByRole("status").getByText("Recorded 8 kits packed").waitFor();
f = page.getByRole("form", { name: "Report a delivery" }); await f.getByLabel(/How many kits did you hand over/).fill("6"); await f.getByRole("button", { name: "Report delivery" }).click();
await page.getByRole("status").getByText("Reported a delivery of 6").waitFor();
const shots = [
  ["coordinator", "drive", driveUrl],
  ["coordinator", "request", requestUrl],
  ["coordinator", "directory", base + "/demo/requests?status=all"],
  ["coordinator", "mydrives", base + "/demo/drives"],
  ["contributor", "drive-contributor", driveUrl],
  ["organization", "org", base + "/demo/organization/00000000-0000-4000-8000-00000000b001"],
  ["organization", "review", null],
  ["organization", "newrequest", base + "/demo/organization/00000000-0000-4000-8000-00000000b001/requests/new"],
  ["reviewer", "admin", base + "/demo/admin"],
  ["coordinator", "public-drive", driveUrl.replace("/drives/", "/d/")],
];
let current = "coordinator";
for (const [persona, name, url] of shots) {
  if (only && !only.includes(name)) continue;
  if (persona !== current) { await as(persona); current = persona; }
  if (name === "review") {
    await page.goto(base + "/demo/organization/00000000-0000-4000-8000-00000000b001");
    await page.getByRole("link", { name: "Review delivery" }).first().click();
    await page.waitForLoadState("networkidle");
  } else {
    await page.goto(url);
  }
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w < 500 ? 844 : 900 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth) return null;
      const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1).slice(0, 3).map((el) => el.tagName + "." + String(el.className).slice(0, 60));
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, wide };
    });
    if (overflow) console.log("OVERFLOW", name, w, JSON.stringify(overflow));
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
await browser.close();
console.log("done");
