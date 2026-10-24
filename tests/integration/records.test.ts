import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listPublicRequests } from "@/server/queries/requests";
import { getConfirmedReceipts, getPublicRecord } from "@/server/queries/records";
import { adoptRequest } from "@/server/services/drives";
import { createPledge, moveKits, recordCollection, reviewDelivery, submitDelivery } from "@/server/services/supplies";
import { createHarness, kitRequestInput, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

describe("confirmed records", () => {
  it("counts accepted deliveries only, never a pledge", async () => {
    const s = await standardScenario(h, kitRequestInput({ targetQuantity: "4", title: "Four kits close to confirmed" }));
    const drive = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 4 });
    const detail = await listPublicRequests(h.as(null), { status: "all", q: "Four kits close" });
    const notebook = detail[0].components.find((c) => c.name === "Notebook")!;
    const backpack = detail[0].components.find((c) => c.name === "Backpack")!;
    const pencils = detail[0].components.find((c) => c.name === "Pencil pack")!;

    await createPledge(h.as(s.contributor), { commitmentId: drive.commitmentId, componentId: notebook.id, quantity: 8 });
    expect(await listPublicRequests(h.as(null), { status: "close", q: "Four kits close" })).toHaveLength(0);
    const pledged = await getPublicRecord(h.as(null), "group", s.groupA);
    expect(pledged?.totals).toEqual([]);
    expect(JSON.stringify(pledged)).not.toContain("Sam Contributor");

    await recordCollection(h.as(s.coordA), { commitmentId: drive.commitmentId, componentId: backpack.id, usable: 3 });
    await recordCollection(h.as(s.coordA), { commitmentId: drive.commitmentId, componentId: notebook.id, usable: 6 });
    await recordCollection(h.as(s.coordA), { commitmentId: drive.commitmentId, componentId: pencils.id, usable: 3 });
    await moveKits(h.as(s.coordA), { commitmentId: drive.commitmentId, kind: "packed", quantity: 3 });
    const { deliveryId } = await submitDelivery(h.as(s.coordA), { commitmentId: drive.commitmentId, quantity: 3 });
    expect(await listPublicRequests(h.as(null), { status: "close", q: "Four kits close" })).toHaveLength(0);

    await reviewDelivery(h.as(s.orgManager), { deliveryId, accepted: 3, note: "Thank you. This note stays off the public record." });
    const listed = await listPublicRequests(h.as(null), { status: "close", q: "Four kits close" });
    expect(listed.map((r) => r.request.id)).toContain(s.requestId);

    const record = await getPublicRecord(h.as(null), "group", s.groupA);
    expect(record?.totals).toEqual([{ unitName: "kit", accepted: 3 }]);
    expect(record?.milestone).toBeNull();
    expect(JSON.stringify(record)).not.toContain("Thank you");
    expect(JSON.stringify(record)).not.toContain("Room 12");
    expect(JSON.stringify(record)).not.toContain("Sam Contributor");

    const receipts = await getConfirmedReceipts(h.as(s.orgStaff), s.orgId);
    expect(Array.isArray(receipts) && receipts[0]?.accepted).toBe(3);
    expect(await getConfirmedReceipts(h.as(s.outsider), s.orgId)).toBe("not_allowed");
    expect(await getConfirmedReceipts(h.as(null), s.orgId)).toBe("not_allowed");
  });
});
