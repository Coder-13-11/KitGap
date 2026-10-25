import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { getDriveWorkspace } from "@/server/queries/drives";
import { getPublicRecord } from "@/server/queries/records";
import { getRequestDetail, listPublicRequests } from "@/server/queries/requests";
import { createClubDrive, getReceipt, issueReceiptLink, reviewDeliveryByReceipt } from "@/server/services/club-drives";
import { adoptRequest } from "@/server/services/drives";
import { moveKits, recordCollection, reviewDelivery, submitDelivery } from "@/server/services/supplies";
import { addDays, todayIn } from "@/domain/dates";
import { createHarness, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

async function expectError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
  return error as DomainError;
}

function clubDriveInput(groupId: string, overrides: Record<string, unknown> = {}) {
  return {
    groupId,
    recipientName: "Westside Pantry",
    recipientCity: "Kissimmee, FL",
    title: "Hygiene kits for Westside Pantry",
    category: "hygiene",
    quantity: "20",
    components: [
      { name: "Toothbrush", quantityPerUnit: "1", details: "" },
      { name: "Bar of soap", quantityPerUnit: "2", details: "" },
    ],
    neededBy: addDays(todayIn("America/New_York"), 20),
    handoverInstructions: "Side door, Tuesday after school",
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}

async function fillPackAndDeliver(coord: string, commitmentId: string, kits: number) {
  const drive = await getDriveWorkspace(h.as(coord), commitmentId);
  if (!drive || drive === "not_allowed") throw new Error("no drive");
  for (const c of drive.components) {
    await recordCollection(h.as(coord), { commitmentId, componentId: c.id, usable: String(c.quantityPerUnit * kits) });
  }
  await moveKits(h.as(coord), { commitmentId, kind: "packed", quantity: kits });
  return submitDelivery(h.as(coord), { commitmentId, quantity: kits });
}

describe("a club's own drive", () => {
  it("works for one club alone, and stays out of the directory and other groups' reach", async () => {
    const s = await standardScenario(h);
    const { commitmentId, requestId } = await createClubDrive(h.as(s.coordA), clubDriveInput(s.groupA));

    const drive = await getDriveWorkspace(h.as(s.coordA), commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("drive not visible");
    expect(drive.tier).toBe("recipient");
    expect(drive.org.name).toBe("Westside Pantry");
    expect(drive.progress.components.map((c) => [c.name, c.needed])).toEqual([
      ["Toothbrush", 20],
      ["Bar of soap", 40],
    ]);

    // Not listed, no public request page, and no other group can join it.
    const listed = await listPublicRequests(h.as(null), { status: "all" });
    expect(listed.map((r) => r.request.id)).not.toContain(requestId);
    expect(await getRequestDetail(h.as(s.coordB), requestId)).toBeNull();
    await expectError(adoptRequest(h.as(s.coordB), { requestId, groupId: s.groupB, quantity: "1" }), "not_allowed");

    // The organization path can't confirm it: nobody belongs to the recipient.
    const { deliveryId } = await fillPackAndDeliver(s.coordA, commitmentId, 3);
    await expectError(reviewDelivery(h.as(s.orgManager), { deliveryId, accepted: 3 }), "not_allowed");
    await expectError(reviewDelivery(h.as(s.coordA), { deliveryId, accepted: 3 }), "not_allowed");
  });

  it("checks the form like any request", async () => {
    const s = await standardScenario(h);
    const error = await expectError(
      createClubDrive(h.as(s.coordA), clubDriveInput(s.groupA, { recipientName: " ", components: [], quantity: "0" })),
      "invalid_input",
    );
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(expect.arrayContaining(["recipientName", "components", "quantity"]));
    // A member who isn't a coordinator can't start one for the group.
    await expectError(createClubDrive(h.as(s.contributor), clubDriveInput(s.groupA)), "not_allowed");
  });
});

describe("receipt links", () => {
  it("lets the recipient confirm without an account, once, labelled as a recipient confirmation", async () => {
    const s = await standardScenario(h);
    const { commitmentId } = await createClubDrive(h.as(s.coordA), clubDriveInput(s.groupA));
    const { deliveryId } = await fillPackAndDeliver(s.coordA, commitmentId, 10);

    // Only a coordinator makes the link; a new link switches the old one off.
    await expectError(issueReceiptLink(h.as(s.contributor), { deliveryId }), "not_allowed");
    const { token: first } = await issueReceiptLink(h.as(s.coordA), { deliveryId });
    const { token } = await issueReceiptLink(h.as(s.coordA), { deliveryId });
    expect(await getReceipt(h.as(null), first)).toBeNull();
    const receipt = await getReceipt(h.as(null), token);
    expect(receipt).toMatchObject({ status: "submitted", quantity: 10, groupName: "Key Club A", recipientName: "Westside Pantry" });
    expect((await getReceipt(h.as(s.coordA), token))?.viewerIsClubMember).toBe(true);

    // Nobody in the club can confirm their own delivery, even with the link.
    await expectError(reviewDeliveryByReceipt(h.as(s.coordA), { token, accepted: 10, signedName: "Jordan" }), "not_allowed");
    await expectError(reviewDeliveryByReceipt(h.as(s.contributor), { token, accepted: 10, signedName: "Sam" }), "not_allowed");
    // The person confirming signs with a name, and a partial decision needs a reason.
    await expectError(reviewDeliveryByReceipt(h.as(null), { token, accepted: 10, signedName: "" }), "invalid_input");
    await expectError(reviewDeliveryByReceipt(h.as(null), { token, accepted: 8, signedName: "Ana, front desk" }), "invalid_input");

    const result = await reviewDeliveryByReceipt(h.as(null), {
      token,
      accepted: 8,
      note: "Two kits had no soap",
      signedName: "Ana, front desk",
    });
    expect(result).toMatchObject({ accepted: 8, notAccepted: 2 });
    await expectError(reviewDeliveryByReceipt(h.as(null), { token, accepted: 10, signedName: "Ana" }), "conflict");
    await expectError(issueReceiptLink(h.as(s.coordA), { deliveryId }), "conflict");

    const drive = await getDriveWorkspace(h.as(s.coordA), commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("drive not visible");
    expect(drive.progress.stages).toMatchObject({ accepted: 8, needsFollowUp: 2, pendingReview: 0 });
    expect(drive.deliveries[0]).toMatchObject({ confirmedVia: "receipt", signedName: "Ana, front desk", accepted: 8 });

    // The club's public record keeps the two tiers apart.
    const record = await getPublicRecord(h.as(null), "group", s.groupA);
    expect(record?.totals).toEqual([]);
    expect(record?.recipientTotals).toEqual([{ unitName: "kit", accepted: 8 }]);
    expect(record?.timeline[0]).toMatchObject({ tier: "recipient", partnerName: "Westside Pantry", accepted: 8 });
  });

  it("is only for a club's own drive: a KitGap organization confirms from its account", async () => {
    const s = await standardScenario(h);
    const { commitmentId } = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: "5" });
    const { deliveryId } = await fillPackAndDeliver(s.coordA, commitmentId, 5);
    await expectError(issueReceiptLink(h.as(s.coordA), { deliveryId }), "not_allowed");

    await reviewDelivery(h.as(s.orgManager), { deliveryId, accepted: 5 });
    const record = await getPublicRecord(h.as(null), "group", s.groupA);
    expect(record?.totals).toEqual([{ unitName: "kit", accepted: 5 }]);
    expect(record?.recipientTotals).toEqual([]);
    expect(record?.timeline[0]).toMatchObject({ tier: "verified" });
  });
});
