"use client";
import { useState } from "react";
import { guestPledgeAction } from "@/actions/contributions";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { SelectField, TextField } from "../ui/field";
import { useBase } from "../ui/base";
export function GuestPledgeForm({commitmentId,items}:{commitmentId:string;items:{id:string;name:string;available:number}[]}) {
  const [token,setToken]=useState<string|null>(null);
  const base=useBase();
  if(token) return <div className="space-y-4 rounded-2xl bg-forest-tint p-5" role="status">
    <h2 className="font-serif text-xl font-semibold">You’re on the list. Thank you.</h2>
    <p>Your promise is saved. Arrange collection with the club coordinator who shared this drive.</p>
    <a href={`${base}/help#${token}`} className="inline-flex min-h-12 items-center font-semibold">Open and save my private pledge link →</a>
    <p className="text-sm">This link lets you view or cancel your pledge for 30 days. Keep it private. Without an account, you’ll need this link to return.</p>
  </div>;
  const open=items.filter(i=>i.available>0);
  if(!open.length) return <p>Every item has been pledged or collected. Thank you for checking.</p>;
  return <ActionForm action={guestPledgeAction} hidden={{commitmentId}} resetOnSuccess={false} onSuccess={data=>setToken((data as {token:string}).token)}>
    {(errors,idFor)=><>
      <SelectField id={idFor("componentId")} name="componentId" label="What can you bring?" error={errors.componentId} options={open.map(i=>({value:i.id,label:`${i.name} · ${i.available} unclaimed`}))} />
      <TextField id={idFor("quantity")} name="quantity" label="How many?" defaultValue="1" inputMode="numeric" pattern="[0-9]*" error={errors.quantity} />
      <TextField id={idFor("name")} name="name" label="First name or nickname" autoComplete="given-name" maxLength={80} hint="Only the club coordinators see this." error={errors.name} />
      <p className="text-sm text-muted">No account needed. This is a promise, not a delivery. Bring only what’s listed. Students: arrange the handoff with your club leader or a trusted adult.</p>
      <SubmitButton full pendingLabel="Saving your pledge…">Confirm my pledge</SubmitButton>
    </>}
  </ActionForm>;
}

