import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { getDriveWorkspace, type DriveWorkspace } from "@/server/queries/drives";
import { getRequestDetail } from "@/server/queries/requests";
import { adoptRequest } from "@/server/services/drives";
import {
  cancelDelivery,
  closePledge,
  createPledge,
  moveKits,
  recordCollection,
  reviewDelivery,
  submitDelivery,
  voidCollection,
} from "@/server/services/supplies";
import { createHarness, kitRequestInput, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

async function workspace(userId: string, commitmentId: string): Promise<DriveWorkspace> {
  const drive = await getDriveWorkspace(h.as(userId), commitmentId);
  if (!drive || drive === "not_allowed") throw new Error(`drive not visible: ${drive}`);
  return drive;
}

function line(drive: DriveWorkspace, name: string) {
  return drive.progress.components.find((c) => c.name === name)!;
}

async function setup(quantity = 20) {
  const s = await standardScenario(h);
  const { commitmentId } = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity });
  const drive = await workspace(s.coordA, commitmentId);
  const id = (name: string) => drive.components.find((c) => c.name === name)!.id;
  return { ...s, commitmentId, backpack: id("Backpack"), notebook: id("Notebook"), pencils: id("Pencil pack") };
}

describe("pledges and received supplies", () => {
  it("a pledge does not count as collected; a partial receipt leaves only the rest outstanding", async () => {
    const s = await setup();
    const { pledgeId } = await createPledge(h.as(s.contributor), {
      commitmentId: s.commitmentId,
      componentId: s.notebook,
      quantity: "10",
    });
    let drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Notebook")).toMatchObject({ needed: 40, collected: 0, openPledged: 10, uncovered: 30 });
    expect(drive.progress.supportedByCollected).toBe(0);

    await recordCollection(h.as(s.coordA), {
      commitmentId: s.commitmentId,
      componentId: s.notebook,
      pledgeId,
      usable: "5",
      unusable: "1",
    });
    drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Notebook")).toMatchObject({ collected: 5, unusable: 1, openPledged: 4, stillNeeded: 35, uncovered: 31 });
    expect(drive.pledges[0]).toMatchObject({ quantity: 10, received: 6, outstanding: 4, status: "partly_received" });

    // The contributor withdraws the rest; what arrived stays recorded.
    await closePledge(h.as(s.contributor), { pledgeId });
    drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Notebook")).toMatchObject({ collected: 5, openPledged: 0, uncovered: 35 });
    expect(drive.pledges[0].status).toBe("withdrawn");
  });

  it("does not accept a pledge for more than is still uncovered", async () => {
    const s = await setup(5);
    await createPledge(h.as(s.contributor), { commitmentId: s.commitmentId, componentId: s.backpack, quantity: 3 });
    await expect(
      createPledge(h.as(s.contributor), { commitmentId: s.commitmentId, componentId: s.backpack, quantity: 3 }),
    ).rejects.toThrow(/Only 2 backpacks still need a pledge/);
  });

  it("records unpledged donations and shows surplus without inflating kits", async () => {
    const s = await setup(10);
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.backpack, usable: 14 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.notebook, usable: 20 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.pencils, usable: 10 });
    const drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Backpack").surplus).toBe(4);
    expect(drive.progress.packableNow).toBe(10);
    await expect(moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: 11 })).rejects.toThrow(
      /Only 10 kits still need packing/,
    );
  });

  it("20 backpacks, 30 notebooks and 20 pencil packs support exactly 15 kits", async () => {
    const s = await setup(20);
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.backpack, usable: 20 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.notebook, usable: 30 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.pencils, usable: 20 });
    const drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.supportedByCollected).toBe(15);
    expect(drive.bottleneck.headline).toBe("10 more notebooks complete the remaining 20 kits.");
    await expect(moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: 16 })).rejects.toBeInstanceOf(
      DomainError,
    );
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: 15 });
    const after = await workspace(s.coordA, s.commitmentId);
    expect(after.progress.stages).toMatchObject({ built: 15, ready: 15, toBuild: 5 });
    expect(after.progress.supportedByCollected).toBe(15);
    expect(after.progress.packableNow).toBe(0);
  });

  it("refuses to remove a collection entry whose supplies are already packed", async () => {
    const s = await setup(5);
    const { entryId } = await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.backpack, usable: 5 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.notebook, usable: 10 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.pencils, usable: 5 });
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: 5 });
    await expect(voidCollection(h.as(s.coordA), { entryId, reason: "typo" })).rejects.toThrow(/already packed/);
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "unpacked", quantity: 5 });
    await voidCollection(h.as(s.coordA), { entryId, reason: "typo" });
    const drive = await workspace(s.coordA, s.commitmentId);
    expect(line(drive, "Backpack").collected).toBe(0);
    expect(drive.collections.find((c) => c.id === entryId)?.voided).toBe(true);
  });
});

describe("packing, delivery and review", () => {
  async function packed(quantity: number, kits: number) {
    const s = await setup(quantity);
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.backpack, usable: kits });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.notebook, usable: kits * 2 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.pencils, usable: kits });
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: kits });
    return s;
  }

  it("moves kits through disjoint stages without counting any twice", async () => {
    const s = await packed(20, 20);
    const first = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 8 });
    let drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.stages).toMatchObject({ built: 20, ready: 12, pendingReview: 8, accepted: 0 });
    expect(drive.progress.deliverableNow).toBe(12);

    await reviewDelivery(h.as(s.orgManager), { deliveryId: first.deliveryId, accepted: 8 });
    drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.stages).toMatchObject({ ready: 12, pendingReview: 0, accepted: 8 });
    const st = drive.progress.stages;
    expect(st.ready + st.pendingReview + st.accepted + st.needsFollowUp + st.setAside).toBe(st.built);
    await expect(submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 13 })).rejects.toThrow(/12 kits are packed/);
  });

  it("partial receipt, rejection, correction and retry never inflate accepted totals", async () => {
    const s = await packed(10, 10);
    // Correction: the coordinator reported the wrong number and takes it back.
    const wrong = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 10 });
    await cancelDelivery(h.as(s.coordA), { deliveryId: wrong.deliveryId });
    await expect(reviewDelivery(h.as(s.orgManager), { deliveryId: wrong.deliveryId, accepted: 10 })).rejects.toMatchObject({
      code: "conflict",
    });

    const key = randomUUID();
    const batch = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 6, idempotencyKey: key });
    // A network retry of the same submission does not create a second delivery.
    const retry = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 6, idempotencyKey: key });
    expect(retry.deliveryId).toBe(batch.deliveryId);

    // Partial acceptance: 4 accepted, 2 returned with a reason.
    await expect(
      reviewDelivery(h.as(s.orgManager), { deliveryId: batch.deliveryId, accepted: 4, notAccepted: 2, note: "" }),
    ).rejects.toMatchObject({ fieldErrors: { note: expect.any(String) } });
    await expect(
      reviewDelivery(h.as(s.orgManager), { deliveryId: batch.deliveryId, accepted: 4, notAccepted: 1, note: "Two missing" }),
    ).rejects.toBeInstanceOf(DomainError);
    await reviewDelivery(h.as(s.orgManager), {
      deliveryId: batch.deliveryId,
      accepted: 4,
      notAccepted: 2,
      note: "Two kits were missing pencil packs",
    });
    // The same decision can't be counted again.
    await expect(reviewDelivery(h.as(s.orgStaff), { deliveryId: batch.deliveryId, accepted: 6 })).rejects.toMatchObject({
      code: "conflict",
    });

    let detail = await getRequestDetail(h.as(null), s.requestId);
    expect(detail!.totals).toMatchObject({ accepted: 4, pendingReview: 0, reserved: 6 });
    let drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.stages).toMatchObject({ ready: 4, accepted: 4, needsFollowUp: 2 });
    expect(drive.nextStep.action).toBe("follow_up");

    // Fix the two kits and deliver everything that's left.
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "repaired", quantity: 2, note: "Added pencils" });
    const rest = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 6 });
    await reviewDelivery(h.as(s.orgStaff), { deliveryId: rest.deliveryId, accepted: 6 });
    detail = await getRequestDetail(h.as(null), s.requestId);
    expect(detail!.totals).toMatchObject({ accepted: 10, reserved: 0, available: 90 });
    drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.stages).toMatchObject({ built: 10, ready: 0, accepted: 10, needsFollowUp: 0 });
    expect(drive.nextStep.action).toBe("done");
  });

  it("setting returned kits aside requires packing replacements from collected supplies", async () => {
    const s = await packed(4, 4);
    const d = await submitDelivery(h.as(s.coordA), { commitmentId: s.commitmentId, quantity: 4 });
    await reviewDelivery(h.as(s.orgManager), { deliveryId: d.deliveryId, accepted: 3, notAccepted: 1, note: "Backpack torn" });
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "set_aside", quantity: 1 });
    let drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.stages).toMatchObject({ accepted: 3, needsFollowUp: 0, setAside: 1, toBuild: 1 });
    expect(line(drive, "Backpack").stillNeeded).toBe(1);
    expect(drive.bottleneck.headline).toBe(
      "To complete the remaining 1 kit, you still need 1 backpack, 2 notebooks, and 1 pencil pack.",
    );
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.backpack, usable: 1 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.notebook, usable: 2 });
    await recordCollection(h.as(s.coordA), { commitmentId: s.commitmentId, componentId: s.pencils, usable: 1 });
    await moveKits(h.as(s.coordA), { commitmentId: s.commitmentId, kind: "packed", quantity: 1 });
    drive = await workspace(s.coordA, s.commitmentId);
    expect(drive.progress.deliverableNow).toBe(1);
  });
});

describe("single-item requests", () => {
  it("counts collected items as ready for delivery with no packing step", async () => {
    const s = await standardScenario(
      h,
      kitRequestInput({
        title: "Composition notebooks for 6th grade",
        requestType: "item",
        unitName: "Composition notebook",
        targetQuantity: "100",
        components: [{ name: "", quantityPerUnit: "1", details: "Wide-ruled, 100 sheets" }],
      }),
    );
    const { commitmentId } = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 30 });
    const drive = await workspace(s.coordA, commitmentId);
    expect(drive.components).toHaveLength(1);
    await recordCollection(h.as(s.coordA), { commitmentId, componentId: drive.components[0].id, usable: 12 });
    await expect(moveKits(h.as(s.coordA), { commitmentId, kind: "packed", quantity: 1 })).rejects.toThrow(/don't need packing/);
    const d = await submitDelivery(h.as(s.coordA), { commitmentId, quantity: 12 });
    await reviewDelivery(h.as(s.orgManager), { deliveryId: d.deliveryId, accepted: 12 });
    const after = await workspace(s.coordA, commitmentId);
    expect(after.progress.stages).toMatchObject({ accepted: 12, ready: 0, toBuild: 18 });
    expect(after.bottleneck.headline).toBe("18 more composition notebooks are needed.");
  });
});
