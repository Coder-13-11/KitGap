import { describe, expect, it } from "vitest";
import {
  allowedNumbers,
  briefing,
  diagnose,
  emailDrafts,
  instagramDrafts,
  onlyKnownNumbers,
  partnerIdeas,
  routeQuestion,
  suggestedChunk,
  type KitInput,
} from "@/domain/kit-helper";

const base: KitInput = {
  orgName: "Westside Food Pantry",
  title: "Weekend food bags for families",
  category: "food",
  unitName: "Bag",
  city: "Kissimmee, FL",
  target: 40,
  accepted: 12,
  promised: 32,
  available: 8,
  activeDrives: 1,
  helperGroups: ["Westside Neighbors"],
  neededBy: "2026-11-06",
  daysLeft: 12,
  passed: false,
  views: 140,
  viewsLast7: [7, 12, 10, 15, 9, 14, 17],
  items: ["2 cans of soup", "1 bag of rice"],
  need: "Kids at our pantry go home on Friday with nothing to eat until Monday. These bags cover the weekend.",
  updatesCount: 1,
  daysSinceUpdate: 3,
  url: "https://kitgap.example/requests/1",
  asker: "organization",
  askerName: "Ana Ruiz",
};

describe("Kit's advice", () => {
  it("says few people have seen it when views are low", () => {
    const tips = diagnose({ ...base, views: 4, accepted: 0, activeDrives: 0 });
    expect(tips[0].title).toBe("Not many people have seen it");
    expect(tips[0].next).toBe("instagram");
  });

  it("spots people looking but nobody offering, and suggests a smaller ask", () => {
    const tips = diagnose({ ...base, views: 200, activeDrives: 0, accepted: 0, promised: 0, available: 40 });
    expect(tips[0].title).toBe("People look, but nobody has offered yet");
    expect(tips[0].detail).toContain("10 bags at a time");
  });

  it("warns when time is short and points to the groups already helping", () => {
    const tip = diagnose({ ...base, daysLeft: 3 }).find((t) => t.title.startsWith("Only"));
    expect(tip?.title).toBe("Only 3 days left");
    expect(tip?.next).toBe("email");
  });

  it("celebrates when everything is promised, with no fixes", () => {
    const tips = diagnose({ ...base, available: 0, promised: 40 });
    expect(tips.some((t) => t.title === "Everything is promised")).toBe(true);
    expect(tips.every((t) => t.tone === "good")).toBe(true);
  });

  it("opens with the real numbers", () => {
    expect(briefing(base)).toBe("140 people have opened the page. 1 group is helping, and 8 bags still need someone with 12 days to go.");
  });

  it("asks for a doable amount", () => {
    expect(suggestedChunk(3)).toBe(3);
    expect(suggestedChunk(40)).toBe(10);
    expect(suggestedChunk(25)).toBe(5);
    expect(suggestedChunk(200)).toBe(50);
  });
});

describe("Kit's drafts", () => {
  it("writes captions with the real numbers, the date, the items and the city hashtag", () => {
    const drafts = instagramDrafts(base);
    expect(drafts.map((d) => d.id)).toEqual(["ask", "story", "progress"]);
    expect(drafts[0].text).toContain("Westside Food Pantry needs 8 bags by");
    expect(drafts[0].text).toContain("• 2 cans of soup");
    expect(drafts[0].text).toContain("#Kissimmee");
    expect(drafts[1].text.startsWith("Kids at our pantry go home on Friday")).toBe(true);
  });

  it("leads with a last call when the date is close", () => {
    expect(instagramDrafts({ ...base, daysLeft: 2 })[0].id).toBe("urgent");
  });

  it("writes a thank-you when nothing is left to ask for", () => {
    expect(instagramDrafts({ ...base, available: 0 }).map((d) => d.id)).toEqual(["thanks"]);
  });

  it("drafts emails to helpers, a nearby organization and local partners, signed by the asker", () => {
    const emails = emailDrafts(base, ["Harbor Food Bank"]);
    expect(emails.map((e) => e.id)).toEqual(["helpers", "neighbor-org", "grocery", "faith", "club"]);
    expect(emails[0].body).toContain("Ana Ruiz");
    expect(emails[2].body).toContain("donation box");
  });

  it("suggests partners that fit the kind of need", () => {
    const pets = partnerIdeas({ ...base, category: "pets", helperGroups: [] }, []);
    expect(pets.map((p) => p.title)).toEqual(["A pet store", "A vet clinic", "A 4-H or school club"]);
  });
});

describe("Kit understands typed questions", () => {
  it.each([
    ["why isn't my drive getting a lot of donations?", "why"],
    ["can you write an insta caption", "instagram"],
    ["draft an email to the grocery store", "email"],
    ["who should I partner with", "partners"],
    ["how many people saw it", "stats"],
    ["what's the weather", null],
  ])("%s → %s", (q, intent) => {
    expect(routeQuestion(q)).toBe(intent);
  });
});

describe("the number guardrail for AI-written text", () => {
  const allowed = allowedNumbers({ target: 40, accepted: 12, neededBy: "Nov 6, 2026" });
  it("accepts text that uses only real numbers", () => {
    expect(onlyKnownNumbers("12 of 40 bags confirmed, needed by Nov 6. Link: https://x.y/123456", allowed)).toBe(true);
  });
  it("rejects a made-up number", () => {
    expect(onlyKnownNumbers("We've already fed 300 families!", allowed)).toBe(false);
  });
});
