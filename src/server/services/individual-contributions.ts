import { DomainError } from "@/domain/errors";
import { acceptsDeliveries } from "@/domain/phase";
import { assertInvariants, loadDriveState, logActivity, mutate, newId, progressOf, type ServiceContext } from "./core";

/** A personal donor confirms having the listed supplies; this never accepts a delivery. */
export async function prepareIndividualContribution(ctx: ServiceContext, input: {commitmentId:string; idempotencyKey:string}) {
  return mutate(ctx,{action:"individual.prepare",idempotencyKey:input.idempotencyKey},async(tx,userId)=>{
    const state=await loadDriveState(tx,input.commitmentId,{lock:true});
    const [group]=await tx`select personal_owner_id from workspaces where id=${state.commitment.groupId}`;
    if(group?.personalOwnerId!==userId) throw new DomainError("not_allowed","Only the person bringing these items can mark them ready.");
    if(state.commitment.status!=="active" || !acceptsDeliveries(state.request.status)) throw new DomainError("closed","This contribution is no longer active.");
    const progress=progressOf(state);
    const quantity=progress.stages.toBuild;
    if(quantity<=0) return {quantity:0};
    for(const c of progress.components) {
      const needed=Math.max(0,quantity*c.quantityPerUnit-c.unallocated);
      if(needed) await tx`insert into collection_entries (id,commitment_id,component_id,usable_quantity,unusable_quantity,note,recorded_by)
        values (${newId()},${state.commitment.id},${c.componentId},${needed},0,'Personal contribution: supplies ready',${userId})`;
    }
    if(state.request.requestType==="kit") await tx`insert into kit_movements(id,commitment_id,kind,quantity,note,created_by)
      values(${newId()},${state.commitment.id},'packed',${quantity},'Personal contribution: complete kits ready',${userId})`;
    await logActivity(tx,{kind:"individual.prepared",audience:"group",actorId:userId,requestId:state.request.id,commitmentId:state.commitment.id,workspaceId:state.commitment.groupId,data:{quantity}});
    await assertInvariants(tx,state.request.id,state.commitment.id);
    return {quantity};
  });
}
