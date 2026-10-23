import { describe, expect, it } from "vitest";
import {
  commitmentLedger,
  driveInvariantViolations,
  driveProgress,
  maxCompleteUnits,
  requestTotals,
  supplyList,
  type DriveInput,
} from "@/domain/quantities";
import type { DeliveryRecord } from "@/domain/types";
import { RECIPE, collected, commitment, delivery, movement, pledge } from "./factories";

function kitDrive(quantity: number, extra: Partial<DriveInput> = {}): DriveInput {
  const c = commitment(quantity);
  return {
    requestType: "kit",
    components: RECIPE,
    commitment: c,
    pledges: [],
    collections: [],
    movements: [],
    deliveries: [],
    ...extra,
    ...(extra.commitment ? {} : { commitment: c }),
  };
}

describe("supply list", () => {
  it("multiplies the recipe by the number of kits (100 kits -> 100 / 200 / 100)", () => {
    const lines = supplyList(RECIPE, 100);
    expect(lines.map((l) => [l.name, l.total])).toEqual([
      ["Backpack", 100],
      ["Notebook", 200],
      ["Pencil pack", 100],
    ]);
  });

  it("derives the supply list for an adopted share (20 kits -> 20 / 40 / 20)", () => {
    expect(supplyList(RECIPE, 20).map((l) => l.total)).toEqual([20, 40, 20]);
  });

  it("rejects a zero or fractional recipe quantity instead of computing with it", () => {
    expect(() => supplyList([{ ...RECIPE[0], quantityPerUnit: 0 }], 5)).toThrow(RangeError);
    expect(() => maxCompleteUnits([{ id: "x", quantityPerUnit: 1.5 }], new Map([["x", 3]]))).toThrow(RangeError);
  });
});

describe("request availability", () => {
  // The worked example from the brief, step by step.
  it("follows the adopt / accept / withdraw example exactly", () => {
    const a = commitment(20);
    const b = commitment(30);
    const deliveries: DeliveryRecord[] = [];

    let totals = requestTotals(100, [a, b], deliveries);
    expect(totals).toMatchObject({ accepted: 0, reserved: 50, available: 50 });

    deliveries.push(delivery(a.id, 5, { accepted: 5, notAccepted: 0 }));
    totals = requestTotals(100, [a, b], deliveries);
    expect(totals).toMatchObject({ accepted: 5, reserved: 45, available: 50 });

    const aWithdrawn = { ...a, status: "withdrawn" as const, withdrawnAt: new Date() };
    totals = requestTotals(100, [aWithdrawn, b], deliveries);
    expect(totals).toMatchObject({ accepted: 5, reserved: 30, available: 65 });
  });

  it("keeps a pending delivery reserved after its group withdraws, then releases only what was not accepted", () => {
    const a = commitment(20);
    const b = commitment(30);
    const pending = delivery(a.id, 8);
    let totals = requestTotals(100, [a, b], [pending]);
    expect(totals).toMatchObject({ reserved: 50, pendingReview: 8, available: 50 });

    // A withdraws: only the 12 units that are neither accepted nor under review are released.
    const aWithdrawn = { ...a, status: "withdrawn" as const, withdrawnAt: new Date() };
    totals = requestTotals(100, [aWithdrawn, b], [pending]);
    expect(totals).toMatchObject({ reserved: 38, pendingReview: 8, available: 62 });

    // The organization accepts 6 and does not accept 2.
    const reviewed = { ...pending, status: "reviewed" as const, acceptedQuantity: 6, notAcceptedQuantity: 2, reviewedAt: new Date() };
    totals = requestTotals(100, [aWithdrawn, b], [reviewed]);
    expect(totals).toMatchObject({ accepted: 6, reserved: 30, pendingReview: 0, available: 64 });
  });

  it("does not let a not-accepted delivery advance accepted progress", () => {
    const a = commitment(20);
    const totals = requestTotals(100, [a], [delivery(a.id, 10, { accepted: 0, notAccepted: 10 })]);
    expect(totals).toMatchObject({ accepted: 0, reserved: 20, available: 80 });
  });

  it("ignores cancelled deliveries", () => {
    const a = commitment(20);
    const cancelled = delivery(a.id, 10, undefined, "cancelled");
    expect(requestTotals(100, [a], [cancelled])).toMatchObject({ accepted: 0, pendingReview: 0, reserved: 20 });
  });

  it("never reports negative availability", () => {
    const a = commitment(120);
    expect(requestTotals(100, [a], []).available).toBe(0);
  });

  it("counts a commitment's accepted units once, not on top of the commitment", () => {
    const a = commitment(20);
    const ledger = commitmentLedger(a, [delivery(a.id, 20, { accepted: 20, notAccepted: 0 })]);
    expect(ledger).toMatchObject({ committed: 20, accepted: 20, reserved: 0 });
    expect(requestTotals(100, [a], [delivery(a.id, 20, { accepted: 20, notAccepted: 0 })])).toMatchObject({
      accepted: 20,
      reserved: 0,
      available: 80,
      promised: 20,
    });
  });
});

describe("kit math", () => {
  it("20 backpacks, 30 notebooks and 20 pencil packs make 15 complete 1:2:1 kits", () => {
    const quantities = new Map([
      ["backpack", 20],
      ["notebook", 30],
      ["pencils", 20],
    ]);
    expect(maxCompleteUnits(RECIPE, quantities)).toBe(15);

    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const progress = driveProgress({
      ...drive,
      collections: [collected(c, "backpack", 20), collected(c, "notebook", 30), collected(c, "pencils", 20)],
    });
    expect(progress.supportedByCollected).toBe(15);
    expect(progress.packableNow).toBe(15);
    const notebook = progress.components.find((x) => x.componentId === "notebook")!;
    expect(notebook).toMatchObject({ needed: 40, collected: 30, stillNeeded: 10, uncovered: 10 });
  });

  it("does not double count packed kits: supported kits include packed ones, packable kits do not", () => {
    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const progress = driveProgress({
      ...drive,
      collections: [collected(c, "backpack", 20), collected(c, "notebook", 30), collected(c, "pencils", 20)],
      movements: [movement(c, "packed", 10)],
    });
    expect(progress.stages.built).toBe(10);
    expect(progress.stages.ready).toBe(10);
    expect(progress.supportedByCollected).toBe(15); // 10 packed + 5 more possible
    expect(progress.packableFromUnallocated).toBe(5);
    expect(progress.packableNow).toBe(5);
    expect(progress.stages.toBuild).toBe(10);
    const backpack = progress.components.find((x) => x.componentId === "backpack")!;
    expect(backpack).toMatchObject({ collected: 20, inUnits: 10, unallocated: 10, stillNeeded: 0, surplus: 0 });
  });

  it("caps packable kits at the commitment and shows extra supplies as surplus", () => {
    const drive = kitDrive(10);
    const c = drive.commitment.id;
    const progress = driveProgress({
      ...drive,
      collections: [collected(c, "backpack", 14), collected(c, "notebook", 30), collected(c, "pencils", 12)],
    });
    expect(progress.supportedByCollected).toBe(12);
    expect(progress.packableNow).toBe(10);
    const backpack = progress.components.find((x) => x.componentId === "backpack")!;
    expect(backpack.surplus).toBe(4);
    const notebook = progress.components.find((x) => x.componentId === "notebook")!;
    expect(notebook.surplus).toBe(10);
  });

  it("moves kits between disjoint stages without duplicating them", () => {
    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const collections = [collected(c, "backpack", 20), collected(c, "notebook", 40), collected(c, "pencils", 20)];
    const movements = [movement(c, "packed", 20)];
    const deliveries = [
      delivery(c, 8, { accepted: 6, notAccepted: 2 }), // partial acceptance
      delivery(c, 5), // awaiting review
    ];
    let progress = driveProgress({ ...drive, collections, movements, deliveries });
    expect(progress.stages).toMatchObject({
      built: 20,
      ready: 7,
      pendingReview: 5,
      accepted: 6,
      needsFollowUp: 2,
      setAside: 0,
      toBuild: 0,
    });
    const s = progress.stages;
    expect(s.ready + s.pendingReview + s.accepted + s.needsFollowUp + s.setAside).toBe(s.built);

    // Repair one returned kit and set the other aside; one replacement kit is then needed.
    progress = driveProgress({
      ...drive,
      collections,
      movements: [...movements, movement(c, "repaired", 1), movement(c, "set_aside", 1)],
      deliveries,
    });
    expect(progress.stages).toMatchObject({ ready: 8, needsFollowUp: 0, setAside: 1, toBuild: 1 });
    const notebook = progress.components.find((x) => x.componentId === "notebook")!;
    expect(notebook.stillNeeded).toBe(2); // the replacement kit needs two notebooks
  });

  it("limits what can be delivered to ready kits that the commitment still needs", () => {
    const drive = kitDrive(10);
    const c = drive.commitment.id;
    const progress = driveProgress({
      ...drive,
      collections: [collected(c, "backpack", 10), collected(c, "notebook", 20), collected(c, "pencils", 10)],
      movements: [movement(c, "packed", 10)],
      deliveries: [delivery(c, 4)],
    });
    expect(progress.deliverableNow).toBe(6);
  });

  it("flags impossible states", () => {
    const drive = kitDrive(10);
    const c = drive.commitment.id;
    const tooManyPacked = driveProgress({
      ...drive,
      collections: [collected(c, "backpack", 3), collected(c, "notebook", 6), collected(c, "pencils", 3)],
      movements: [movement(c, "packed", 4)],
    });
    expect(driveInvariantViolations(tooManyPacked)).not.toHaveLength(0);

    const deliveredUnpacked = driveProgress({ ...drive, deliveries: [delivery(c, 1)] });
    expect(driveInvariantViolations(deliveredUnpacked)).toContain("more units handed over than were ready");
  });
});

describe("pledges and collection", () => {
  it("does not count a pledge as collected", () => {
    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const progress = driveProgress({ ...drive, pledges: [pledge(c, "notebook", 10)] });
    const notebook = progress.components.find((x) => x.componentId === "notebook")!;
    expect(notebook).toMatchObject({ collected: 0, openPledged: 10, stillNeeded: 40, uncovered: 30 });
    expect(progress.supportedByCollected).toBe(0);
  });

  it("leaves only the unfulfilled part of a partly received pledge outstanding", () => {
    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const p = pledge(c, "notebook", 10);
    const progress = driveProgress({
      ...drive,
      pledges: [p],
      collections: [collected(c, "notebook", 5, { unusable: 1, pledgeId: p.id })],
    });
    expect(progress.pledgeOutstanding.get(p.id)).toBe(4); // 10 promised, 6 brought (1 unusable)
    const notebook = progress.components.find((x) => x.componentId === "notebook")!;
    expect(notebook).toMatchObject({ collected: 5, unusable: 1, openPledged: 4, stillNeeded: 35, uncovered: 31 });
  });

  it("drops withdrawn pledges and voided entries", () => {
    const drive = kitDrive(20);
    const c = drive.commitment.id;
    const progress = driveProgress({
      ...drive,
      pledges: [pledge(c, "backpack", 5, "closed")],
      collections: [collected(c, "backpack", 7, { voided: true })],
    });
    const backpack = progress.components.find((x) => x.componentId === "backpack")!;
    expect(backpack).toMatchObject({ collected: 0, openPledged: 0, uncovered: 20 });
  });
});

describe("single-item requests", () => {
  const ITEM = [{ ...RECIPE[1], quantityPerUnit: 1, name: "Composition notebook" }];

  it("treats usable collected items as ready for delivery without a packing step", () => {
    const c = commitment(100);
    const progress = driveProgress({
      requestType: "item",
      components: ITEM,
      commitment: c,
      pledges: [],
      collections: [collected(c.id, "notebook", 60)],
      movements: [],
      deliveries: [delivery(c.id, 25, { accepted: 25, notAccepted: 0 })],
    });
    expect(progress.stages).toMatchObject({ built: 60, ready: 35, accepted: 25, toBuild: 40 });
    expect(progress.deliverableNow).toBe(35);
    expect(progress.packableNow).toBe(0);
    expect(progress.components[0]).toMatchObject({ stillNeeded: 40, uncovered: 40 });
  });

  it("shows extra items as surplus instead of counting them toward the commitment", () => {
    const c = commitment(10);
    const progress = driveProgress({
      requestType: "item",
      components: ITEM,
      commitment: c,
      pledges: [],
      collections: [collected(c.id, "notebook", 13)],
      movements: [],
      deliveries: [],
    });
    expect(progress.stages).toMatchObject({ ready: 13, toBuild: 0, surplusUnits: 3 });
    expect(progress.deliverableNow).toBe(10);
  });
});
