import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { adoptRequest } from "@/server/services/drives";
import { prepareIndividualContribution } from "@/server/services/individual-contributions";
import { getDriveWorkspace, getPublicDrive } from "@/server/queries/drives";
import { getPublicRecord } from "@/server/queries/records";
import { getRequestDetail } from "@/server/queries/requests";
import { rotateInviteToken } from "@/server/services/workspaces";
import { reviewDelivery, submitDelivery } from "@/server/services/supplies";
import { createHarness, standardScenario, type Harness } from "./harness";
let h: Harness;
beforeAll(async () => { h = await createHarness(); });
afterAll(async () => { if(h) await h.close(); });
it("creates a private individual commitment without naming a group; retries reserve once", async () => {
  const s = await standardScenario(h);
  const input = { requestId: s.requestId, individual: true, quantity: 2, idempotencyKey: randomUUID() };
  const first = await adoptRequest(h.as(s.outsider), input);
  expect(await adoptRequest(h.as(s.outsider), input)).toEqual(first);
  expect((await getRequestDetail(h.as(null), s.requestId))!.totals).toMatchObject({available:98, accepted:0});
  expect(await getPublicDrive(h.as(null), first.commitmentId)).toBeNull();
  expect(await getPublicRecord(h.as(null), "group", first.groupId)).toBeNull();
  expect((await getRequestDetail(h.as(null), s.requestId))!.drives).toHaveLength(0);
  await expect(rotateInviteToken(h.as(s.outsider), {workspaceId:first.groupId})).rejects.toMatchObject({code:"not_allowed"});
});
it("prepares only the owner's remaining items, atomically, and never confirms delivery", async () => {
  const s = await standardScenario(h);
  const d = await adoptRequest(h.as(s.outsider), {requestId:s.requestId, individual:true, quantity:2});
  await expect(prepareIndividualContribution(h.as(s.coordA), {commitmentId:d.commitmentId,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"not_allowed"});
  const input = {commitmentId:d.commitmentId,idempotencyKey:randomUUID()};
  await prepareIndividualContribution(h.as(s.outsider), input);
  await prepareIndividualContribution(h.as(s.outsider), input);
  const drive = await getDriveWorkspace(h.as(s.outsider), d.commitmentId);
  if(!drive || drive === "not_allowed") throw Error("missing drive");
  expect(drive.progress.stages).toMatchObject({ready:2,accepted:0});
  expect(drive.progress.components.map(c=>c.collected)).toEqual([2,4,2]);
  const delivery = await submitDelivery(h.as(s.outsider), {commitmentId:d.commitmentId, quantity:2});
  await expect(reviewDelivery(h.as(s.outsider), {deliveryId:delivery.deliveryId,accepted:2})).rejects.toMatchObject({code:"not_allowed"});
});
it("does not let individuals and clubs over-reserve the final quantity", async () => {
  const s = await standardScenario(h);
  await adoptRequest(h.as(s.coordA), {requestId:s.requestId,groupId:s.groupA,quantity:99});
  const results = await Promise.allSettled([
    adoptRequest(h.as(s.outsider),{requestId:s.requestId,individual:true,quantity:1}),
    adoptRequest(h.as(s.coordB),{requestId:s.requestId,groupId:s.groupB,quantity:1}),
  ]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect((await getRequestDetail(h.as(null),s.requestId))!.totals.available).toBe(0);
});
it("keeps the private individual workspace out of the club picker", async () => {
  const s = await standardScenario(h);
  const d = await adoptRequest(h.as(s.coordA), {requestId:s.requestId, individual:true, quantity:1});
  const viewer = (await getRequestDetail(h.as(s.coordA), s.requestId))!.viewer;
  expect(viewer.personalDriveId).toBe(d.commitmentId);
  expect(viewer.adminGroups.map(g=>g.id)).not.toContain(d.groupId);
  expect(viewer.adminGroups.find(g=>g.id===s.groupA)?.existingCommitmentId).toBeNull();
});
