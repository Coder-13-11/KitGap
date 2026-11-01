"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export function RefreshOnReturn(){const router=useRouter();useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")router.refresh();};document.addEventListener("visibilitychange",refresh);return()=>document.removeEventListener("visibilitychange",refresh);},[router]);return null;}

