"use client";
import { prepareContributionAction,configureGuestsAction,revokeGuestLinksAction } from "@/actions/contributions";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
export function PrepareContribution({commitmentId}:{commitmentId:string}) {
  return <ActionForm action={prepareContributionAction} hidden={{commitmentId}} success="Your items are ready. Record the drop-off after you deliver them.">{()=> <><label className="flex items-start gap-3"><input type="checkbox" required name="ready" className="mt-1 size-5 accent-forest" /><span>I have all the items listed, in the requested condition, packed and ready.</span></label><SubmitButton full pendingLabel="Recording items…">Ready to bring</SubmitButton></>}</ActionForm>;
}
export function GuestAccessToggle({commitmentId,enabled}:{commitmentId:string;enabled:boolean}) {
  return <div className="space-y-4"><ActionForm action={configureGuestsAction} hidden={{commitmentId,enabled:String(!enabled)}} success={enabled?"Guest pledges paused. Existing helpers can still manage their promises.":"Guest pledges are open on your public drive link."}>{()=> <><p className="text-sm text-muted">Let neighbors pledge an item without joining your club. They see the general area, not private drop-off instructions. Arrange collection through your club.</p><SubmitButton variant="secondary">{enabled?"Pause guest pledges":"Allow guest pledges"}</SubmitButton></>}</ActionForm><details><summary className="min-h-12 cursor-pointer text-sm font-semibold">Replace compromised guest access</summary><ActionForm action={revokeGuestLinksAction} hidden={{commitmentId}} success="Existing private guest links are revoked. Guest pledging is paused.">{()=> <><p className="text-sm">Revoke all private management links if one was shared accidentally. Promises stay recorded; you can close them from the pledge list.</p><label className="flex items-start gap-2"><input type="checkbox" name="confirm" className="mt-1 size-5" /><span>Stop existing guest links from working.</span></label><SubmitButton variant="danger">Revoke guest links</SubmitButton></>}</ActionForm></details></div>;
}

