import { createHash, createHmac } from "node:crypto";
import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import { describeDeadline } from "@/domain/dates";
import { inSchema, type Tx } from "../db/client";
import { assertInvariants, isUuid, loadDriveState, logActivity, mutate, newId, now, progressOf, read, requireRole, type ServiceContext } from "./core";
import { parseQuantity } from "./drives";

function hash(token:string) { return createHash("sha256").update(token).digest("hex"); }
function tokenFor(ctx:ServiceContext, driveId:string, key:string) {
  const secret=process.env.DEMO_COOKIE_SECRET;
  if(!secret || secret.length<32) throw new DomainError("not_allowed","Guest contributions are not configured yet. Please ask for a member invitation.");
  return createHmac("sha256",secret).update(`guest:${ctx.schema}:${driveId}:${key}`).digest("base64url");
}
export async function configureGuestPledges(ctx:ServiceContext,input:{commitmentId:string;enabled:boolean}) {
  return mutate(ctx,{action:"drive.guest_access"},async(tx,userId)=>{
    const state=await loadDriveState(tx,input.commitmentId,{lock:true});
    await requireRole(tx,state.commitment.groupId,userId,"admin");
    const [group]=await tx`select personal_owner_id from workspaces where id=${state.commitment.groupId}`;
    if(group?.personalOwnerId) throw new DomainError("not_allowed","Personal contributions are private.");
    await tx`update commitments set guest_pledges_enabled=${input.enabled} where id=${input.commitmentId}`;
    return {enabled:input.enabled};
  });
}
export async function guestPledgesEnabled(ctx:ServiceContext,commitmentId:string) {
  if(!isUuid(commitmentId)) return false;
  return read(ctx,async tx=>{
    const [row]=await tx`select guest_pledges_enabled from commitments where id=${commitmentId}`;
    return row?.guestPledgesEnabled===true;
  });
}
export interface GuestPledgeInput {commitmentId:string;componentId:string;quantity:unknown;name:string;idempotencyKey:string}
/** Narrow anonymous capability. No guest is granted a workspace membership.
 * Like mutate(), this transaction locks, deduplicates and checks invariants;
 * it intentionally cannot impersonate an authenticated actor. */
export async function createGuestPledge(ctx:ServiceContext,input:GuestPledgeInput) {
  if(!isUuid(input.idempotencyKey)) throw new DomainError("invalid_input","Reload this form and try again.");
  const token=tokenFor(ctx,input.commitmentId,input.idempotencyKey);
  const tokenHash=hash(token);
  return inSchema(ctx.sql,ctx.schema,async tx=>{
    // Per-drive persistent cap, serialized across instances; no IP or guest tracking.
    // Kept per drive so a flood on one drive cannot block guests everywhere else.
    await tx`select pg_advisory_xact_lock(hashtext(${ctx.schema+":guest-create:"+input.commitmentId}))`;
    const state=await loadDriveState(tx,input.commitmentId,{lock:true});
    const [previous]=await tx`select pledge_id from guest_pledge_access where token_hash=${tokenHash}`;
    if(previous) return {pledgeId:previous.pledgeId as string,token};
    const [settings]=await tx`select guest_pledges_enabled from commitments where id=${input.commitmentId}`;
    const [group]=await tx`select personal_owner_id from workspaces where id=${state.commitment.groupId}`;
    if(!settings?.guestPledgesEnabled || group?.personalOwnerId) throw new DomainError("not_allowed","This drive needs a member invitation before you can pledge.");
    if(state.commitment.status!=="active" || !acceptsDeliveries(state.request.status) || (state.request.neededBy && describeDeadline(state.request.neededBy,state.request.timezone,now(ctx)).passed)) throw new DomainError("closed","This drive is no longer taking pledges.");
    const quantity=parseQuantity(input.quantity);
    const name=input.name.trim();
    if(!name || name.length>80) throw new DomainError("invalid_input","Enter a first name or nickname, up to 80 characters.",{fieldErrors:{name:"Enter a name or nickname"}});
    const line=progressOf(state).components.find(c=>c.componentId===input.componentId);
    if(!line) throw new DomainError("invalid_input","Choose an item on this drive.");
    if(quantity>line.uncovered) throw new DomainError("conflict",`Only ${line.uncovered} are still unclaimed. Please choose a smaller quantity.`,{details:{available:line.uncovered}});
    const since=new Date(now(ctx).getTime()-3600000);
    const [rate]=await tx`select count(*)::int as drive from guest_pledge_access where commitment_id=${input.commitmentId} and created_at>${since}`;
    if(rate.drive>=30) throw new DomainError("conflict","This drive has received many pledges recently. Please try again in an hour or ask the coordinator for help.");
    const pledgeId=newId();
    await tx`insert into pledges(id,commitment_id,component_id,user_id,guest_name,guest_self_service,quantity)
      values(${pledgeId},${input.commitmentId},${input.componentId},null,${name},true,${quantity})`;
    await tx`insert into guest_pledge_access(token_hash,pledge_id,commitment_id,created_at,expires_at)
      values(${tokenHash},${pledgeId},${input.commitmentId},${now(ctx)},${new Date(now(ctx).getTime()+30*86400000)})`;
    await logActivity(tx,{kind:"pledge.created",audience:"group",actorId:null,requestId:state.request.id,commitmentId:input.commitmentId,workspaceId:state.commitment.groupId,data:{component:line.name,quantity}});
    await assertInvariants(tx,state.request.id,state.commitment.id);
    return {pledgeId,token};
  });
}
async function access(tx:Tx,ctx:ServiceContext,token:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row]=await tx`select pledge_id,commitment_id from guest_pledge_access
    where token_hash=${hash(token)} and expires_at>${now(ctx)} and revoked_at is null`;
  return row ?? null;
}
export async function readGuestPledge(ctx:ServiceContext,token:string) {
  return read(ctx,async tx=>{
    const grant=await access(tx,ctx,token); if(!grant) return null;
    const [row]=await tx`select p.id,p.quantity,p.status,rc.name as component_name,r.title,r.location,r.needed_by,c.id as commitment_id,
      coalesce((select sum(e.usable_quantity+e.unusable_quantity) from collection_entries e where e.pledge_id=p.id and e.voided_at is null),0)::int as received
      from pledges p join request_components rc on rc.id=p.component_id join commitments c on c.id=p.commitment_id
      join requests r on r.id=c.request_id where p.id=${grant.pledgeId}`;
    if(!row) return null;
    return {id:row.id as string,quantity:row.quantity as number,status:row.status as string,componentName:row.componentName as string,title:row.title as string,location:row.location as string,neededBy:row.neededBy as string,commitmentId:row.commitmentId as string,received:row.received as number};
  });
}
export async function cancelGuestPledge(ctx:ServiceContext,token:string) {
  return inSchema(ctx.sql,ctx.schema,async tx=>{
    const grant=await access(tx,ctx,token);
    if(!grant) throw new DomainError("not_allowed","This private link has expired or does not work. Ask the coordinator for help.");
    const state=await loadDriveState(tx,grant.commitmentId,{lock:true});
    // Recheck after acquiring the lock in case access was revoked while waiting.
    if(!await access(tx,ctx,token)) throw new DomainError("not_allowed","This link no longer works.");
    await tx`update pledges set status='closed',closed_reason='withdrawn',closed_at=${now(ctx)} where id=${grant.pledgeId} and status='open'`;
    await assertInvariants(tx,state.request.id,state.commitment.id);
    return {done:true};
  });
}

export async function revokeGuestPledgeLinks(ctx:ServiceContext,commitmentId:string) {
  return mutate(ctx,{action:"drive.revoke_guest_links"},async(tx,userId)=>{
    const state=await loadDriveState(tx,commitmentId,{lock:true});
    await requireRole(tx,state.commitment.groupId,userId,"admin");
    await tx`update guest_pledge_access set revoked_at=${now(ctx)} where commitment_id=${commitmentId} and revoked_at is null`;
    await tx`update commitments set guest_pledges_enabled=false where id=${commitmentId}`;
    return {done:true};
  });
}
