"use client";
import { useState } from "react";
import { adoptAction } from "@/actions/app";
import { ActionForm } from "@/components/ui/action-form";
import { QuantityPicker } from "@/components/ui/quantity-picker";
import { SubmitButton } from "@/components/ui/button";
import { countNoun } from "@/domain/text";
export function IndividualPledgeForm({requestId,available,initialQuantity,unitName,components}:{requestId:string;available:number;initialQuantity:number;unitName:string;components:{id:string;name:string;quantityPerUnit:number;details:string}[]}) {
  const [quantity,setQuantity]=useState(String(Math.max(1,Math.min(initialQuantity,available))));
  const n=/^\d+$/.test(quantity)?Number(quantity):0;
  const valid=n>=1&&n<=available;
  return <ActionForm action={adoptAction} hidden={{requestId,individual:"true"}} resetOnSuccess={false}>
    {(errors,idFor)=><>
      <label htmlFor={idFor("quantity")} className="block text-lg font-semibold">How many can you bring?</label>
      <QuantityPicker smallPicks id={idFor("quantity")} name="quantity" value={quantity} onChange={setQuantity} max={available} unitName={unitName} invalid={!valid || Boolean(errors.quantity)} />
      {errors.quantity ? <p role="alert" className="text-danger">{errors.quantity}</p> : null}
      <div className="rounded-xl bg-forest-tint p-5" aria-live="polite">
        <h2 className="font-semibold">Your list{valid ? ` for ${countNoun(n,unitName)}` : ""}</h2>
        {valid ? <ul className="mt-2 divide-y divide-forest/15">{components.map(c=><li key={c.id} className="flex justify-between gap-4 py-3"><div>{c.name}{c.details?<p className="text-sm">{c.details}</p>:null}</div><strong className="tabular">{n*c.quantityPerUnit}</strong></li>)}</ul> : <p>Choose a whole number from 1 to {available}.</p>}
      </div>
      <p className="text-sm text-muted">Bring only what’s listed. This is a promise, not a delivery. You can reduce or cancel it later.</p>
      <SubmitButton full disabled={!valid} pendingLabel="Saving your pledge…">Confirm my pledge</SubmitButton>
    </>}
  </ActionForm>;
}

