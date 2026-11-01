import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { adoptRequest } from "@/server/services/drives";
import { configureGuestPledges, createGuestPledge, readGuestPledge, cancelGuestPledge, revokeGuestPledgeLinks } from "@/server/services/guest-contributions";
import { getDriveWorkspace } from "@/server/queries/drives";
import { createHarness, standardScenario, type Harness } from "./harness";
let h: Harness;
beforeAll(async()=>{ h=await createHarness(); });
afterAll(async()=>{if(h) await h.close();});
async function scenario() {
  const s=await standardScenario(h);
  const d=await adoptRequest(h.as(s.coordA),{requestId:s.requestId,groupId:s.groupA,quantity:1});
  const drive=await getDriveWorkspace(h.as(s.coordA),d.commitmentId);
  if(!drive||drive==="not_allowed") throw Error("missing");
  return {...s,...d,componentId:drive.components[0].id};
}
it("requires coordinator opt-in; guest promises never count as collected",async()=>{
  const s=await scenario();
  const input={commitmentId:s.commitmentId,componentId:s.componentId,quantity:1,name:"Helpful neighbor",idempotencyKey:randomUUID()};
  await expect(createGuestPledge(h.as(null),input)).rejects.toMatchObject({code:"not_allowed"});
  await expect(configureGuestPledges(h.as(s.outsider),{commitmentId:s.commitmentId,enabled:true})).rejects.toMatchObject({code:"not_allowed"});
  await configureGuestPledges(h.as(s.coordA),{commitmentId:s.commitmentId,enabled:true});
  const result=await createGuestPledge(h.as(null),input);
  expect(await createGuestPledge(h.as(null),input)).toEqual(result);
  const guest=await readGuestPledge(h.as(null),result.token);
  expect(guest).toMatchObject({quantity:1,componentName:"Backpack",status:"open"});
  expect(JSON.stringify(guest)).not.toMatch(/Room 12|407|maya@|coordinatorContact/);
  const drive=await getDriveWorkspace(h.as(s.coordA),s.commitmentId);
  if(!drive||drive==="not_allowed") throw Error("missing");
  expect(drive.progress.components[0].collected).toBe(0);
  await cancelGuestPledge(h.as(null),result.token);
  expect(await readGuestPledge(h.as(null),result.token)).toMatchObject({status:"closed"});
});
it("rejects invalid tokens and serializes the last item across guests",async()=>{
  const s=await scenario();
  await configureGuestPledges(h.as(s.coordA),{commitmentId:s.commitmentId,enabled:true});
  expect(await readGuestPledge(h.as(null),"not-a-token")).toBeNull();
  const results=await Promise.allSettled([1,2].map(()=>createGuestPledge(h.as(null),{commitmentId:s.commitmentId,componentId:s.componentId,quantity:1,name:"Neighbor",idempotencyKey:randomUUID()})));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
});

it("expires and revokes management tokens without releasing already-promised items",async()=>{
 const s=await scenario();
 await configureGuestPledges(h.as(s.coordA),{commitmentId:s.commitmentId,enabled:true});
 const r=await createGuestPledge(h.as(null),{commitmentId:s.commitmentId,componentId:s.componentId,quantity:1,name:"Neighbor",idempotencyKey:randomUUID()});
 const later={...h.as(null),now:()=>new Date(Date.now()+31*86400000)};
 expect(await readGuestPledge(later,r.token)).toBeNull();
 await expect(cancelGuestPledge(later,r.token)).rejects.toMatchObject({code:"not_allowed"});
 await expect(revokeGuestPledgeLinks(h.as(s.outsider),s.commitmentId)).rejects.toMatchObject({code:"not_allowed"});
 await revokeGuestPledgeLinks(h.as(s.coordA),s.commitmentId);
 expect(await readGuestPledge(h.as(null),r.token)).toBeNull();
 const d=await getDriveWorkspace(h.as(s.coordA),s.commitmentId);
 if(!d||d==="not_allowed")throw Error("missing");
 expect(d.progress.components[0].uncovered).toBe(0);
});
