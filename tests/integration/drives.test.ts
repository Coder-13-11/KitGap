import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { createSql } from "@/server/db/client";
import { getDriveWorkspace } from "@/server/queries/drives";
import { getRequestDetail } from "@/server/queries/requests";
import { adoptRequest, changeCommitmentQuantity, withdrawCommitment } from "@/server/services/drives";
import { moveKits, recordCollection, reviewDelivery, submitDelivery } from "@/server/services/supplies";
import { createWorkspace } from "@/server/services/workspaces";
import { createHarness, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

async function availability(requestId: string) {
  const detail = await getRequestDetail(h.as(null), requestId);
  return detail!.totals;
}

async function fillAndPack(coord: string, commitmentId: string, kits: number) {
  const drive = await getDriveWorkspace(h.as(coord), commitmentId);
  if (!drive || drive === "not_allowed") throw new Error("no drive");
  for (const c of drive.components) {
    await recordCollection(h.as(coord), {
      commitmentId,
      componentId: c.id,
      usable: String(c.quantityPerUnit * kits),
    });
  }
  await moveKits(h.as(coord), { commitmentId, kind: "packed", quantity: kits });
}

describe("starting a drive", () => {
  it("adopting 20 of 100 kits creates a drive needing 20 / 40 / 20 and leaves 80 available", async () => {
    const s = await standardScenario(h);
    const { commitmentId } = await adoptRequest(h.as(s.coordA), {
      requestId: s.requestId,
      groupId: s.groupA,
      quantity: "20",
      idempotencyKey: randomUUID(),
    });
    const drive = await getDriveWorkspace(h.as(s.coordA), commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("drive not visible");
    expect(drive.progress.components.map((c) => [c.name, c.needed])).toEqual([
      ["Backpack", 20],
      ["Notebook", 40],
      ["Pencil pack", 20],
    ]);
    expect(await availability(s.requestId)).toMatchObject({ reserved: 20, available: 80, accepted: 0 });

    // A different connection (another server instance / session) sees the same state.
    const other = createSql(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!, { max: 1 });
    try {
      const fresh = await getRequestDetail({ sql: other, schema: h.schema, userId: s.coordB }, s.requestId);
      expect(fresh!.totals.available).toBe(80);
      expect(fresh!.drives.map((d) => [d.groupName, d.quantity])).toEqual([["Key Club A", 20]]);
    } finally {
      await other.end();
    }
  });

  it("can create a minimal group in the same step", async () => {
    const s = await standardScenario(h);
    const { groupId } = await adoptRequest(h.as(s.outsider), {
      requestId: s.requestId,
      newGroup: { name: "Neighborhood Book Club", city: "Celebration, FL" },
      quantity: 5,
    });
    const drives = await getRequestDetail(h.as(s.outsider), s.requestId);
    expect(drives!.viewer.adminGroups.map((g) => g.id)).toContain(groupId);
  });

  it("lets only one of two simultaneous adoptions of the last 10 kits succeed", async () => {
    const s = await standardScenario(h);
    await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 90 });
    expect((await availability(s.requestId)).available).toBe(10);

    const results = await Promise.allSettled([
      adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 10, idempotencyKey: randomUUID() }),
      adoptRequest(h.as(s.orgManager), {
        requestId: s.requestId,
        newGroup: { name: "Parent Volunteers", city: "Kissimmee, FL" },
        quantity: 10,
        idempotencyKey: randomUUID(),
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(DomainError);
    expect(rejected[0].reason.code).toBe("conflict");
    expect(await availability(s.requestId)).toMatchObject({ reserved: 100, available: 0 });
  });

  it("explains changed availability instead of over-reserving", async () => {
    const s = await standardScenario(h);
    await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 95 });
    const attempt = adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 10 });
    await expect(attempt).rejects.toMatchObject({ code: "conflict", details: { available: 5 } });
    await expect(attempt).rejects.toThrow(/Only 5 kits are still available/);
  });

  it("creates one drive when the same submission is sent twice, even at the same moment", async () => {
    const s = await standardScenario(h);
    const key = randomUUID();
    const input = { requestId: s.requestId, groupId: s.groupA, quantity: 12, idempotencyKey: key };
    const [first, second] = await Promise.all([adoptRequest(h.as(s.coordA), input), adoptRequest(h.as(s.coordA), input)]);
    const third = await adoptRequest(h.as(s.coordA), input);
    expect(second.commitmentId).toBe(first.commitmentId);
    expect(third.commitmentId).toBe(first.commitmentId);
    const totals = await availability(s.requestId);
    expect(totals).toMatchObject({ reserved: 12, available: 88, activeDrives: 1 });
  });

  it("does not let a group open a second drive for the same request", async () => {
    const s = await standardScenario(h);
    await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 5 });
    await expect(
      adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 5, idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects invalid and unavailable quantities on the server", async () => {
    const s = await standardScenario(h);
    for (const quantity of ["0", "-3", "2.5", "ten", "", "1e3", 101]) {
      await expect(adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity })).rejects.toBeInstanceOf(
        DomainError,
      );
    }
    expect((await availability(s.requestId)).reserved).toBe(0);
  });
});

describe("acceptance and withdrawal", () => {
  it("follows the brief's example: A 20, B 30, 5 accepted from A, A withdraws", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 20 });
    await adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 30 });
    expect(await availability(s.requestId)).toMatchObject({ accepted: 0, reserved: 50, available: 50 });

    await fillAndPack(s.coordA, a.commitmentId, 5);
    const { deliveryId } = await submitDelivery(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 5 });
    await reviewDelivery(h.as(s.orgManager), { deliveryId, accepted: 5 });
    expect(await availability(s.requestId)).toMatchObject({ accepted: 5, reserved: 45, available: 50 });

    const result = await withdrawCommitment(h.as(s.coordA), { commitmentId: a.commitmentId, note: "Club schedule changed" });
    expect(result).toMatchObject({ released: 15, stillReserved: 0 });
    expect(await availability(s.requestId)).toMatchObject({ accepted: 5, reserved: 30, available: 65 });
  });

  it("keeps a delivery awaiting review reserved after withdrawal and releases only the rest", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 20 });
    await adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 30 });
    await fillAndPack(s.coordA, a.commitmentId, 8);
    const { deliveryId } = await submitDelivery(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 8 });

    const result = await withdrawCommitment(h.as(s.coordA), { commitmentId: a.commitmentId, note: "" });
    expect(result).toMatchObject({ released: 12, stillReserved: 8 });
    expect(await availability(s.requestId)).toMatchObject({ accepted: 0, pendingReview: 8, reserved: 38, available: 62 });

    // While those 8 are under review, they can't be adopted by anyone else.
    await adoptRequest(h.as(s.orgManager), {
      requestId: s.requestId,
      newGroup: { name: "Late Group", city: "Kissimmee, FL" },
      quantity: 62,
    });
    expect((await availability(s.requestId)).available).toBe(0);

    await reviewDelivery(h.as(s.orgStaff), { deliveryId, accepted: 6, notAccepted: 2, note: "Two kits were missing notebooks" });
    expect(await availability(s.requestId)).toMatchObject({ accepted: 6, pendingReview: 0, reserved: 92, available: 2 });
  });

  it("lets a drive change size only within availability and above what is already packed", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 20 });
    await adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 70 });
    await expect(changeCommitmentQuantity(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 31 })).rejects.toMatchObject({
      code: "conflict",
    });
    await changeCommitmentQuantity(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 30 });
    expect((await availability(s.requestId)).available).toBe(0);

    await fillAndPack(s.coordA, a.commitmentId, 6);
    await expect(changeCommitmentQuantity(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 5 })).rejects.toThrow(
      /can't be smaller than 6/,
    );
    await changeCommitmentQuantity(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 6 });
    expect((await availability(s.requestId)).available).toBe(24);
  });
});

describe("closing and deadlines", () => {
  it("blocks new drives after closing or after the needed-by date, but keeps existing drives working", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    const { closeRequest } = await import("@/server/services/requests");
    await closeRequest(h.as(s.orgManager), { requestId: s.requestId, note: "We have enough groups for now" });
    await expect(
      adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 5 }),
    ).rejects.toMatchObject({ code: "closed" });
    // The existing drive can still deliver.
    await fillAndPack(s.coordA, a.commitmentId, 2);
    await submitDelivery(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 2 });

    // Past the needed-by date (evaluated in the organization's timezone).
    const s2 = await standardScenario(h);
    const later = { ...h.as(s2.coordB), now: () => new Date(Date.now() + 40 * 86_400_000) };
    await expect(adoptRequest(later, { requestId: s2.requestId, groupId: s2.groupB, quantity: 5 })).rejects.toThrow(
      /needed-by date for this request has passed/,
    );
  });

  it("does not let a group adopt on a cancelled request", async () => {
    const s = await standardScenario(h);
    const { cancelRequest } = await import("@/server/services/requests");
    await cancelRequest(h.as(s.orgManager), { requestId: s.requestId, note: "The program ended early." });
    await expect(adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 5 })).rejects.toMatchObject({
      code: "closed",
    });
  });
});

it("refuses to start a drive for a group the person doesn't coordinate", async () => {
  const s = await standardScenario(h);
  await expect(adoptRequest(h.as(s.contributor), { requestId: s.requestId, groupId: s.groupA, quantity: 5 })).rejects.toMatchObject({
    code: "not_allowed",
  });
  await expect(adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupA, quantity: 5 })).rejects.toMatchObject({
    code: "not_allowed",
  });
  // An organization workspace can't be passed off as a group.
  await expect(adoptRequest(h.as(s.orgManager), { requestId: s.requestId, groupId: s.orgId, quantity: 5 })).rejects.toMatchObject({
    code: "not_allowed",
  });
  await expect(adoptRequest(h.as(null), { requestId: s.requestId, groupId: s.groupA, quantity: 5 })).rejects.toMatchObject({
    code: "sign_in_required",
  });
  void createWorkspace;
});
