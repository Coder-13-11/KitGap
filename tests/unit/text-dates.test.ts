import { describe, expect, it } from "vitest";
import { describeDeadline, formatCalendarDate, isPastDate, todayIn } from "@/domain/dates";
import { describeBottleneck, nextStepForCoordinator } from "@/domain/guidance";
import { requestPhase } from "@/domain/phase";
import { driveProgress } from "@/domain/quantities";
import { countNoun, normalizeItemKey, pluralize } from "@/domain/text";
import { RECIPE, collected, commitment } from "./factories";

describe("wording", () => {
  it("pluralizes item names sensibly", () => {
    expect(pluralize("Backpack")).toBe("Backpacks");
    expect(pluralize("box of crayons")).toBe("boxes of crayons");
    expect(pluralize("Pencil pack (10 pencils)")).toBe("Pencil packs (10 pencils)");
    expect(pluralize("battery")).toBe("batteries");
    expect(countNoun(1, "kit")).toBe("1 kit");
    expect(countNoun(1200, "Notebook")).toBe("1,200 notebooks");
  });

  it("normalizes equivalent names to one key", () => {
    expect(normalizeItemKey("Notebooks")).toBe(normalizeItemKey(" notebook "));
    expect(normalizeItemKey("Boxes")).toBe(normalizeItemKey("box"));
    expect(normalizeItemKey("Pencil pack")).not.toBe(normalizeItemKey("Pencil"));
  });
});

describe("calendar dates", () => {
  it("never shifts a date-only deadline", () => {
    expect(formatCalendarDate("2026-11-20")).toBe("Fri, Nov 20, 2026");
  });

  it("uses the organization's timezone for today", () => {
    const at = new Date("2026-11-21T03:30:00Z"); // 10:30pm Nov 20 in New York, 7:30pm in Los Angeles
    expect(todayIn("America/New_York", at)).toBe("2026-11-20");
    expect(isPastDate("2026-11-20", "America/New_York", at)).toBe(false);
    expect(isPastDate("2026-11-20", "Europe/London", at)).toBe(true);
    expect(describeDeadline("2026-11-20", "America/New_York", at).description).toBe("Due today");
    expect(describeDeadline("2026-11-18", "America/New_York", at).description).toBe("Needed-by date passed 2 days ago");
  });
});

describe("request phases", () => {
  const base = { status: "published" as const, statusNote: "", neededBy: "2026-11-20", timezone: "America/New_York" };
  const at = new Date("2026-10-23T12:00:00Z");
  it("distinguishes open, fully committed, fulfilled, past due and closed", () => {
    expect(requestPhase(base, { accepted: 0, available: 50, target: 100 }, at)).toBe("open");
    expect(requestPhase(base, { accepted: 10, available: 0, target: 100 }, at)).toBe("fully_committed");
    expect(requestPhase(base, { accepted: 100, available: 0, target: 100 }, at)).toBe("fulfilled");
    expect(requestPhase({ ...base, neededBy: "2026-10-01" }, { accepted: 0, available: 50, target: 100 }, at)).toBe("past_due");
    expect(requestPhase({ ...base, status: "closed" }, { accepted: 0, available: 50, target: 100 }, at)).toBe("closed");
    expect(requestPhase({ ...base, status: "draft", statusNote: "Add a date" }, { accepted: 0, available: 0, target: 1 }, at)).toBe("returned");
  });
});

describe("guidance", () => {
  it("names the one missing item when that is all that blocks the kits", () => {
    const c = commitment(20);
    const progress = driveProgress({
      requestType: "kit",
      components: RECIPE,
      commitment: c,
      pledges: [],
      collections: [collected(c.id, "backpack", 20), collected(c.id, "notebook", 30), collected(c.id, "pencils", 20)],
      movements: [],
      deliveries: [],
    });
    expect(describeBottleneck(progress, "kit").headline).toBe("10 more notebooks complete the remaining 20 kits.");
    expect(nextStepForCoordinator(progress, "kit", "Riverbend").action).toBe("pack");
  });
});
