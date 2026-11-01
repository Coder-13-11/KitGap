import { CheckCircle2, CalendarDays } from "lucide-react";
import type { DriveWorkspace } from "@/server/queries/drives";
import { Container, Section } from "../ui/layout-bits";
import { AppLink } from "../ui/base";
import { Notice } from "../ui/notice";
import { PrepareContribution } from "./contribution-actions";
import { DeliveryForm, ChangeQuantityForm, WithdrawDrive, FollowUpForms, CancelDeliveryButton } from "./drive-forms";
import { formatCalendarDate } from "@/domain/dates";
import { countNoun } from "@/domain/text";
export function PersonalContribution({drive}:{drive:DriveWorkspace}) {
  const {commitment,request,org,progress}=drive;
  const {stages}=progress;
  const active=commitment.status==="active" && ["published","closed"].includes(request.status);
  const owner=drive.role==="coordinator";
  return <Container narrow className="space-y-7">
    <AppLink href="/drives" className="inline-flex min-h-12 items-center">← My help</AppLink>
    <header><h1 className="font-serif text-3xl font-bold">{stages.accepted>=commitment.quantity?"It arrived. Thank you.":"Your small thing. Their next step."}</h1><p className="mt-3 text-lg">{countNoun(commitment.quantity,request.unitName)} for {org.name}</p><p className="mt-2 flex items-center gap-2 text-muted"><CalendarDays className="size-4" aria-hidden />By {formatCalendarDate(request.neededBy!)}</p></header>
    {stages.accepted>0?<Notice tone="success" title={`Received by ${org.name}`}><p className="flex items-center gap-2"><CheckCircle2 className="size-5" aria-hidden />{countNoun(stages.accepted,request.unitName)} confirmed. {Math.max(0,commitment.quantity-stages.accepted)} remaining.</p></Notice>:null}
    {!active?<Notice tone="warning" title="This contribution is no longer active">Your earlier deliveries remain on record.</Notice>:null}
    <Section title="What you’re bringing"><ul className="divide-y divide-line rounded-2xl bg-surface px-5">{drive.components.map(c=><li key={c.id} className="flex justify-between gap-4 py-4"><div className="font-semibold">{c.name}<p className="text-sm font-normal text-muted">{c.details}</p></div><strong className="tabular">{c.quantityPerUnit*commitment.quantity}</strong></li>)}</ul></Section>
    <Section title="Where to bring it"><p>{request.handoverInstructions || "Ask the organization to arrange the handoff."}</p><p className="text-muted">{request.coordinatorContact}</p></Section>
    {owner && active && stages.toBuild>0?<Section title="Have everything on the list?"><PrepareContribution commitmentId={commitment.id} /></Section>:null}
    {owner && active && progress.deliverableNow>0?<Section title="After you drop it off"><DeliveryForm commitmentId={commitment.id} deliverableNow={progress.deliverableNow} orgName={org.name} unitName={request.unitName} /></Section>:null}
    {stages.pendingReview>0?<Notice tone="info" title="Waiting for confirmation">{org.name} will check what arrived. A drop-off is only confirmed after their review.</Notice>:null}
    {owner && active && stages.needsFollowUp>0?<FollowUpForms commitmentId={commitment.id} needsFollowUp={stages.needsFollowUp} active={active} unitName={request.unitName} />:null}
    {drive.deliveries.length>0?<Section title="Your deliveries"><ul className="divide-y divide-line">{drive.deliveries.map(d=><li key={d.id} className="space-y-2 py-4"><p className="font-semibold">{countNoun(d.quantity,request.unitName)} · {d.status==="reviewed"?`${d.accepted} accepted`:d.status==="submitted"?"Awaiting review":"Cancelled"}</p>{d.reviewNote?<p>{d.reviewNote}</p>:null}{owner&&d.status==="submitted"?<CancelDeliveryButton deliveryId={d.id} />:null}</li>)}</ul></Section>:null}
    {owner && active?<details className="border-t border-line pt-5"><summary className="min-h-12 cursor-pointer font-semibold">Change or cancel my pledge</summary><div className="space-y-5 pt-4"><ChangeQuantityForm commitmentId={commitment.id} current={commitment.quantity} minimum={Math.max(1,stages.accepted+stages.pendingReview+stages.needsFollowUp+(request.requestType==="kit"?stages.ready:0))} maximum={commitment.quantity+(drive.phase==="open"?drive.requestAvailable:0)} unitName={request.unitName} /><WithdrawDrive commitmentId={commitment.id} releasable={Math.max(0,commitment.quantity-stages.accepted-stages.pendingReview)} pendingReview={stages.pendingReview} accepted={stages.accepted} unitName={request.unitName} orgName={org.name} /></div></details>:null}
  </Container>;
}

