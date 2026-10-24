import { describe, expect, it } from "vitest";
import {
  confirmedMilestone,
  isCloseToConfirmed,
  kitsStillToConfirm,
  oneKitNeedsSentence,
  pledgeImpact,
  shareDriveSentence,
  stillToConfirmSentence,
} from "@/domain/guidance";

describe("kits still to be confirmed", () => {
  it("ignores pledges and counts only accepted kits", () => {
    expect(kitsStillToConfirm(100, 0)).toBe(100);
    expect(stillToConfirmSentence(100, "kit", "Riverbend Family Center")).toBe(
      "100 kits still to be confirmed by Riverbend Family Center.",
    );
    expect(kitsStillToConfirm(100, 13)).toBe(87);
    expect(shareDriveSentence(7, "kit", "Riverbend Family Center")).toBe(
      "Help finish this drive: 7 kits still to be confirmed by Riverbend Family Center.",
    );
  });

  it("does not treat a finished request as close to confirmed", () => {
    expect(isCloseToConfirmed(74, 100)).toBe(false);
    expect(isCloseToConfirmed(75, 100)).toBe(true);
    expect(isCloseToConfirmed(100, 100)).toBe(false);
    expect(isCloseToConfirmed(0, 0)).toBe(false);
  });
});

describe("one kit and a pledge", () => {
  it("lists the recipe for one kit", () => {
    expect(
      oneKitNeedsSentence([
        { name: "Backpack", quantityPerUnit: 1 },
        { name: "Notebook", quantityPerUnit: 2 },
        { name: "Pencil pack", quantityPerUnit: 1 },
      ]),
    ).toBe("One kit still needs 1 backpack, 2 notebooks, and 1 pencil pack.");
  });

  it("says how many kits a pledge could complete, without calling the pledge collected", () => {
    expect(pledgeImpact(2, 2, "Notebook", "kit")).toEqual({
      headline: "2 notebooks are enough for 1 kit.",
      detail: "They count only after the coordinator records them and the organization confirms the kits.",
    });
    expect(pledgeImpact(1, 2, "Notebook", "kit").headline).toBe("Not enough for a kit yet.");
    expect(pledgeImpact(10, 2, "Notebook", "kit").headline).toBe("10 notebooks are enough for 5 kits.");
  });
});

describe("milestones", () => {
  it("starts at 10 confirmed kits and never at 9", () => {
    expect(confirmedMilestone(9)).toBeNull();
    expect(confirmedMilestone(13)?.title).toBe("10 kits confirmed");
    expect(confirmedMilestone(50)?.count).toBe(50);
    expect(confirmedMilestone(100)?.count).toBe(100);
  });
});
