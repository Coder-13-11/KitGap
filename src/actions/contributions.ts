"use server";
import { DomainError } from "@/domain/errors";
import { revalidatePath } from "next/cache";
import { formText, runAction } from "@/server/next/action";
import { prepareIndividualContribution } from "@/server/services/individual-contributions";
import { revokeGuestPledgeLinks, configureGuestPledges, createGuestPledge, readGuestPledge, cancelGuestPledge } from "@/server/services/guest-contributions";
export async function prepareContributionAction(_prev:unknown,fd:FormData) {
  return runAction(async ctx=>{if(formText(fd,"ready")!=="on") throw new DomainError("invalid_input","Confirm that you have all the listed items ready."); const result=await prepareIndividualContribution(ctx,{commitmentId:formText(fd,"commitmentId"),idempotencyKey:formText(fd,"idempotencyKey")});revalidatePath("/","layout");return result;});
}
export async function configureGuestsAction(_prev:unknown,fd:FormData) {
  return runAction(async ctx=>{const result=await configureGuestPledges(ctx,{commitmentId:formText(fd,"commitmentId"),enabled:formText(fd,"enabled")==="true"});revalidatePath("/","layout");return result;});
}
export async function guestPledgeAction(_prev:unknown,fd:FormData) {
  return runAction(async ctx=>{const result=await createGuestPledge(ctx,{commitmentId:formText(fd,"commitmentId"),componentId:formText(fd,"componentId"),quantity:formText(fd,"quantity"),name:formText(fd,"name"),idempotencyKey:formText(fd,"idempotencyKey")});revalidatePath("/","layout");return result;});
}
export async function readGuestAction(token:string) {return runAction(ctx=>readGuestPledge(ctx,token));}
export async function cancelGuestAction(_prev:unknown,fd:FormData) {
  return runAction(async ctx=>{const result=await cancelGuestPledge(ctx,formText(fd,"token"));revalidatePath("/","layout");return result;});
}


export async function revokeGuestLinksAction(_prev:unknown,fd:FormData) {
  return runAction(async ctx=>{
    if(formText(fd,"confirm")!=="on") throw new DomainError("invalid_input","Confirm that existing guest links should stop working.");
    const result=await revokeGuestPledgeLinks(ctx,formText(fd,"commitmentId"));
    revalidatePath("/","layout");return result;
  });
}
