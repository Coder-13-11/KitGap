"use client";
import { useEffect, useState } from "react";
import { readGuestAction,cancelGuestAction } from "@/actions/contributions";
import type { readGuestPledge } from "@/server/services/guest-contributions";
import { ActionForm } from "../ui/action-form";
import { Button,SubmitButton } from "../ui/button";
import { AppLink,useBase } from "../ui/base";
type Pledge=Awaited<ReturnType<typeof readGuestPledge>>;
export function GuestManager() {
  const base=useBase();
  const [token,setToken]=useState("");
  const [pledge,setPledge]=useState<Pledge>(null);
  const [message,setMessage]=useState("Opening your private pledge…");
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    let active=true;
    const fragment=window.location.hash.slice(1);
    let saved="";
    try {saved=sessionStorage.getItem("kitgap:guest:"+base)||"";}catch{}
    const t=fragment||saved;
    if(fragment) {try{sessionStorage.setItem("kitgap:guest:"+base,fragment);}catch{} history.replaceState(null,"",window.location.pathname);}
    readGuestAction(t).then(result=>{if(!active)return;setToken(t);if(result.ok&&result.data){setPledge(result.data);setMessage("");}else setMessage("This link is missing, expired, or no longer works. Open the private link you saved, or ask your club coordinator for help.");}).catch(()=>{if(active)setMessage("Couldn’t load your pledge. Check your connection and reload.");});
    return ()=>{active=false};
  },[base]);
  if(!pledge)return <p role="status">{message}</p>;
  return <div className="space-y-5">
    <div className="rounded-2xl bg-forest-tint p-5"><h2 className="font-serif text-2xl font-semibold">{pledge.quantity} {pledge.componentName}</h2><p className="mt-2">{pledge.title}</p><p className="mt-2 font-semibold">{pledge.status==="closed"?"Pledge closed":pledge.received>=pledge.quantity?"Collected by the coordinator":"Promised · waiting to be collected"}</p><p className="mt-1 text-sm">{pledge.received} recorded as collected. This does not confirm delivery to the organization.</p></div>
    <p>Arrange collection with the club coordinator who shared this drive. Private drop-off details are not shared through guest links.</p>
    <Button variant="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}${base}/help#${token}`);setCopied(true);}catch{setMessage("Copy the private link below.");}}}>{copied?"Private link copied":"Copy my private link"}</Button>
    {message?<p role="status">{message} <a href={`${base}/help#${token}`}>My private pledge link</a></p>:null}
    {pledge.status==="open" && pledge.received<pledge.quantity?<ActionForm action={cancelGuestAction} hidden={{token}} onSuccess={()=>setPledge({...pledge,status:"closed"})} success="The uncollected items are available for others to pledge.">{()=> <><p className="text-sm text-muted">Need to change your quantity? Cancel the uncollected part, then choose again. Items already collected stay recorded.</p><SubmitButton variant="danger">Cancel remaining pledge</SubmitButton></>}</ActionForm>:null}
    <AppLink className="flex min-h-12 items-center" href={`/d/${pledge.commitmentId}`}>Back to the shared drive →</AppLink>
  </div>;
}

