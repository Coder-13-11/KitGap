import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDriveWorkspace, getPublicDrive } from "@/server/queries/drives";
import { getDeliveryForReview, getOrgDashboard, getReviewQueue } from "@/server/queries/organization";
import { getRequestDetail, listPublicRequests } from "@/server/queries/requests";
import { adoptRequest, changeCommitmentQuantity, withdrawCommitment } from "@/server/services/drives";
import {
  approveRequest,
  closeRequest,
  createRequestDraft,
  submitRequestForReview,
  unpublishToDraft,
  updateRequestDraft,
} from "@/server/services/requests";
import {
  closePledge,
  createPledge,
  moveKits,
  recordCollection,
  reviewDelivery,
  submitDelivery,
} from "@/server/services/supplies";
import { createWorkspace, setContactConfirmed } from "@/server/services/workspaces";
import { createHarness, kitRequestInput, standardScenario, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

describe("publishing", () => {
  it("keeps drafts and requests under review out of public view until a reviewer approves", async () => {
    const reviewer = await h.person("Reviewer", { reviewer: true });
    const manager = await h.person("Manager");
    const stranger = await h.person("Stranger");
    const { workspaceId: orgId } = await createWorkspace(h.as(manager), {
      kind: "organization",
      name: "Draft Test Org",
      city: "Orlando, FL",
      contactName: "Manager",
      contactPhone: "(407) 555-0199",
    });
    const input = kitRequestInput({ title: "Unique draft title for visibility test" });
    const { requestId } = await createRequestDraft(h.as(manager), { orgId, fields: input });

    const isListed = async () =>
      (await listPublicRequests(h.as(null), { status: "all", q: "Unique draft title" })).some((r) => r.request.id === requestId);
    expect(await isListed()).toBe(false);
    expect(await getRequestDetail(h.as(null), requestId)).toBeNull();
    expect(await getRequestDetail(h.as(stranger), requestId)).toBeNull();
    expect(await getRequestDetail(h.as(manager), requestId)).not.toBeNull();

    await submitRequestForReview(h.as(manager), { requestId, fields: input });
    expect(await isListed()).toBe(false);
    // The organization can't approve its own request.
    await expect(approveRequest(h.as(manager), { requestId })).rejects.toMatchObject({ code: "not_allowed" });
    const queue = await getReviewQueue(h.as(reviewer));
    expect(queue !== "not_allowed" && queue.requests.some((r) => r.id === requestId)).toBe(true);
    expect(await getReviewQueue(h.as(manager))).toBe("not_allowed");

    await approveRequest(h.as(reviewer), { requestId });
    expect(await isListed()).toBe(true);
  });

  it("validates requests on the server: quantities, recipe, dates and links", async () => {
    const s = await standardScenario(h);
    const bad = [
      kitRequestInput({ targetQuantity: "0" }),
      kitRequestInput({ targetQuantity: "12.5" }),
      kitRequestInput({ components: [{ name: "Backpack", quantityPerUnit: "0", details: "" }] }),
      kitRequestInput({
        components: [
          { name: "Notebook", quantityPerUnit: "1", details: "" },
          { name: "notebooks", quantityPerUnit: "1", details: "" },
        ],
      }),
      kitRequestInput({ neededBy: "2020-01-01" }),
      kitRequestInput({ neededBy: "2026-02-30" }),
      kitRequestInput({ fundraisingUrl: "javascript:alert(1)" }),
      kitRequestInput({ fundraisingUrl: "http://example.org/give" }),
      kitRequestInput({ fundraisingUrl: "data:text/html,hi" }),
    ];
    const { requestId } = await createRequestDraft(h.as(s.orgManager), { orgId: s.orgId, fields: kitRequestInput() });
    for (const fields of bad) {
      await expect(submitRequestForReview(h.as(s.orgManager), { requestId, fields })).rejects.toMatchObject({
        code: "invalid_input",
      });
    }
    // Pencil pack and pencil are different items, not duplicates.
    await submitRequestForReview(h.as(s.orgManager), {
      requestId,
      fields: kitRequestInput({
        fundraisingUrl: "https://example.org/give",
        components: [
          { name: "Pencil pack", quantityPerUnit: "1", details: "" },
          { name: "Pencil", quantityPerUnit: "2", details: "" },
        ],
      }),
    });
  });

  it("freezes the quantity and recipe once a drive exists, and allows copying instead", async () => {
    const s = await standardScenario(h);
    await expect(updateRequestDraft(h.as(s.orgManager), { requestId: s.requestId, fields: kitRequestInput() })).rejects.toMatchObject({
      code: "conflict",
    });
    await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    await expect(unpublishToDraft(h.as(s.orgManager), { requestId: s.requestId })).rejects.toThrow(/Copy this request/);

    const s2 = await standardScenario(h);
    await unpublishToDraft(h.as(s2.orgManager), { requestId: s2.requestId });
    await updateRequestDraft(h.as(s2.orgManager), { requestId: s2.requestId, fields: kitRequestInput({ targetQuantity: "50" }) });
  });
});

describe("permissions on direct calls", () => {
  it("a group cannot accept its own delivery or touch another group's drive", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    const b = await adoptRequest(h.as(s.coordB), { requestId: s.requestId, groupId: s.groupB, quantity: 10 });
    const drive = await getDriveWorkspace(h.as(s.coordA), a.commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("missing drive");
    for (const c of drive.components) {
      await recordCollection(h.as(s.coordA), { commitmentId: a.commitmentId, componentId: c.id, usable: c.quantityPerUnit * 2 });
    }
    await moveKits(h.as(s.coordA), { commitmentId: a.commitmentId, kind: "packed", quantity: 2 });
    const { deliveryId } = await submitDelivery(h.as(s.coordA), { commitmentId: a.commitmentId, quantity: 2 });

    await expect(reviewDelivery(h.as(s.coordA), { deliveryId, accepted: 2 })).rejects.toMatchObject({ code: "not_allowed" });
    await expect(reviewDelivery(h.as(s.contributor), { deliveryId, accepted: 2 })).rejects.toMatchObject({ code: "not_allowed" });
    await expect(reviewDelivery(h.as(s.coordB), { deliveryId, accepted: 2 })).rejects.toMatchObject({ code: "not_allowed" });

    // Group B's coordinator calling group A's drive directly, with valid ids.
    const componentId = drive.components[0].id;
    await expect(recordCollection(h.as(s.coordB), { commitmentId: a.commitmentId, componentId, usable: 1 })).rejects.toMatchObject({
      code: "not_allowed",
    });
    await expect(moveKits(h.as(s.coordB), { commitmentId: a.commitmentId, kind: "unpacked", quantity: 1 })).rejects.toMatchObject({
      code: "not_allowed",
    });
    await expect(changeCommitmentQuantity(h.as(s.coordB), { commitmentId: a.commitmentId, quantity: 1 })).rejects.toMatchObject({
      code: "not_allowed",
    });
    await expect(withdrawCommitment(h.as(s.coordB), { commitmentId: a.commitmentId, note: "" })).rejects.toMatchObject({
      code: "not_allowed",
    });
    // A contributor can pledge but not record receipts or pack.
    await expect(
      recordCollection(h.as(s.contributor), { commitmentId: a.commitmentId, componentId, usable: 1 }),
    ).rejects.toMatchObject({ code: "not_allowed" });
    // Pledging to a group you're not in is refused.
    await expect(createPledge(h.as(s.contributor), { commitmentId: b.commitmentId, componentId, quantity: 1 })).rejects.toMatchObject({
      code: "not_allowed",
    });
    // Someone else's pledge can't be withdrawn by another contributor.
    const { pledgeId } = await createPledge(h.as(s.contributor), { commitmentId: a.commitmentId, componentId, quantity: 1 });
    await expect(closePledge(h.as(s.outsider), { pledgeId })).rejects.toMatchObject({ code: "not_allowed" });
    // Only managers close requests; only reviewers confirm contacts.
    await expect(closeRequest(h.as(s.coordA), { requestId: s.requestId, note: "" })).rejects.toMatchObject({ code: "not_allowed" });
    await expect(closeRequest(h.as(s.orgStaff), { requestId: s.requestId, note: "" })).rejects.toMatchObject({ code: "not_allowed" });
    await expect(setContactConfirmed(h.as(s.orgManager), { workspaceId: s.orgId, confirmed: true })).rejects.toMatchObject({
      code: "not_allowed",
    });

    // The organization's staff member can accept it.
    await reviewDelivery(h.as(s.orgStaff), { deliveryId, accepted: 2 });
    expect((await getRequestDetail(h.as(null), s.requestId))!.totals.accepted).toBe(2);
  });

  it("hides workspaces and deliveries from people outside them", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    expect(await getDriveWorkspace(h.as(s.coordB), a.commitmentId)).toBe("not_allowed");
    expect(await getDriveWorkspace(h.as(null), a.commitmentId)).toBeNull();
    expect(await getOrgDashboard(h.as(s.coordA), s.orgId)).toBe("not_allowed");
    const org = await getOrgDashboard(h.as(s.orgStaff), s.orgId);
    expect(org !== "not_allowed" && org?.org.inviteToken).toBeNull(); // staff aren't managers
  });
});

describe("public pages", () => {
  it("never include private contacts, handover details or contributor identities", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    const drive = await getDriveWorkspace(h.as(s.coordA), a.commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("missing drive");
    await createPledge(h.as(s.contributor), { commitmentId: a.commitmentId, componentId: drive.components[0].id, quantity: 2 });

    const secrets = ["Room 12", "(407) 555-0100", "maya@example.org", "Sam Contributor", "Jordan Coordinator", "invite"];
    const publicData = JSON.stringify([
      await listPublicRequests(h.as(null), { status: "all" }),
      await getRequestDetail(h.as(null), s.requestId),
      await getRequestDetail(h.as(s.outsider), s.requestId),
      await getPublicDrive(h.as(null), a.commitmentId),
    ]);
    for (const secret of secrets) expect(publicData).not.toContain(secret);
    expect(publicData).not.toMatch(/inviteToken|contactEmail|handoverInstructions|coordinatorContact/);

    // A coordinator with a drive sees the handover details; a contributor sees only their own pledges.
    const forCoordinator = await getRequestDetail(h.as(s.coordA), s.requestId);
    expect(forCoordinator!.privateDetails?.handoverInstructions).toContain("Room 12");
    const forContributor = await getDriveWorkspace(h.as(s.contributor), a.commitmentId);
    if (!forContributor || forContributor === "not_allowed") throw new Error("missing drive");
    expect(forContributor.pledges.every((p) => p.isMine && p.contributorName === null)).toBe(true);
    expect(forContributor.collections).toHaveLength(0);
    expect(forContributor.group.inviteToken).toBeNull();
  });

  it("only coordinators of the drive see who pledged", async () => {
    const s = await standardScenario(h);
    const a = await adoptRequest(h.as(s.coordA), { requestId: s.requestId, groupId: s.groupA, quantity: 10 });
    const drive = await getDriveWorkspace(h.as(s.coordA), a.commitmentId);
    if (!drive || drive === "not_allowed") throw new Error("missing drive");
    await createPledge(h.as(s.contributor), { commitmentId: a.commitmentId, componentId: drive.components[1].id, quantity: 4 });
    const asCoordinator = await getDriveWorkspace(h.as(s.coordA), a.commitmentId);
    if (!asCoordinator || asCoordinator === "not_allowed") throw new Error("missing drive");
    expect(asCoordinator.pledges[0].contributorName).toBe("Sam Contributor");
    const asOrg = await getDriveWorkspace(h.as(s.orgManager), a.commitmentId);
    if (!asOrg || asOrg === "not_allowed") throw new Error("missing drive");
    expect(asOrg.role).toBe("organization");
    expect(asOrg.pledges).toHaveLength(0);
    expect(JSON.stringify(asOrg.activity)).not.toContain("Sam Contributor");
    const review = await getDeliveryForReview(h.as(s.coordB), "00000000-0000-4000-8000-000000000000");
    expect(review).toBeNull();
  });
});

describe("database access outside the server", () => {
  it("gives the Supabase API roles no access to KitGap tables", async () => {
    const roles = await h.sql`select rolname from pg_roles where rolname in ('anon', 'authenticated')`;
    if (roles.length === 0) return; // plain Postgres without Supabase roles
    for (const role of ["anon", "authenticated"]) {
      await expect(
        h.sql.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          return tx.unsafe(`select * from ${h.schema}.requests limit 1`);
        }),
      ).rejects.toThrow(/permission denied/);
      await expect(
        h.sql.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          return tx.unsafe(`select * from kitgap.requests limit 1`);
        }),
      ).rejects.toThrow(/permission denied/);
    }
  });
});
