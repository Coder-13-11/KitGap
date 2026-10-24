import { describe, expect, it } from "vitest";
import { coordinatorGettingStarted, homeNextStep, orgGettingStarted, type HomeDrive, type HomeOrg } from "@/domain/onboarding";

const drive = (over: Partial<HomeDrive> = {}): HomeDrive => ({
  commitmentId: "c1",
  requestTitle: "School kits",
  role: "coordinator",
  active: true,
  nextStep: { action: "pack", title: "Pack 5 kits" },
  myOpenPledges: 0,
  pledgeCount: 0,
  collectedItems: 0,
  built: 0,
  isKit: true,
  ...over,
});

const org = (over: Partial<HomeOrg> = {}): HomeOrg => ({ id: "o1", name: "Riverbend", pendingDeliveries: 0, requests: [], hasContact: true, ...over });

describe("signed-in home", () => {
  it("puts a delivery waiting for review ahead of everything else", () => {
    const next = homeNextStep([drive()], [org({ pendingDeliveries: 2, requests: [{ status: "published" }] })]);
    expect(next).toMatchObject({ title: "Check 2 deliveries for Riverbend", href: "/organization/o1#pending" });
  });

  it("then the coordinator's next step, skipping drives that are only waiting", () => {
    const waiting = drive({ commitmentId: "c0", nextStep: { action: "wait", title: "Waiting for Riverbend" } });
    expect(homeNextStep([waiting, drive()], [])).toMatchObject({ title: "Pack 5 kits", href: "/drives/c1" });
  });

  it("asks an organization with no requests to post one, and a member to pledge", () => {
    expect(homeNextStep([], [org()]).title).toBe("Post your first request");
    expect(homeNextStep([drive({ role: "contributor" })], []).href).toBe("/drives/c1#pledge");
    expect(homeNextStep([drive({ role: "contributor", myOpenPledges: 3 })], []).title).toBe("Bring the 3 items you pledged");
  });

  it("never leaves a new account at a dead end", () => {
    expect(homeNextStep([], [])).toMatchObject({ href: "/requests", label: "Find a request", urgency: "now" });
    expect(homeNextStep([drive({ nextStep: { action: "done", title: "Drive complete" } })], [])).toMatchObject({
      href: "/requests",
      label: "Find a request",
      urgency: "idle",
    });
    expect(homeNextStep([drive({ nextStep: { action: "done", title: "Drive complete" } })], [org({ requests: [{ status: "published" }] })])).toMatchObject({
      title: "You're all caught up",
      href: "/organization/o1",
      label: "Open your requests",
      urgency: "idle",
    });
  });

  it("tracks the getting-started steps for each role", () => {
    expect(orgGettingStarted(org({ hasContact: true, requests: [{ status: "in_review" }] })).map((i) => i.done)).toEqual([true, true, false]);
    expect(coordinatorGettingStarted(drive({ pledgeCount: 4, collectedItems: 10 })).map((i) => i.done)).toEqual([true, true, false]);
    expect(coordinatorGettingStarted(drive({ isKit: false })).map((i) => i.label)).not.toContain("Pack your first kits");
  });
});
