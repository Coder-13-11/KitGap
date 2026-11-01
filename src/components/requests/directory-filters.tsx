"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { useBase, withBase } from "../ui/base";
import { buttonClass } from "../ui/button-class";
import { inputClass } from "../ui/field";
export const STATUS_CHIPS=[{value:"open",label:"Open now"},{value:"close",label:"Almost finished"},{value:"completed",label:"Confirmed complete"},{value:"in_progress",label:"Fully promised or closed"},{value:"all",label:"Everything"}] as const;
export function DirectoryFilters({q,category,status,sort,categories}:{q:string;category:string;status:string;sort:string;categories:{value:string;label:string}[]}) {
 const base=useBase();
 return <form role="search" action={withBase(base,"/requests")} method="get" className="space-y-3">
 <div className="flex gap-2"><div className="relative min-w-0 flex-1"><label htmlFor="q" className="sr-only">Search items, organizations or cities</label><Search className="pointer-events-none absolute top-4 left-4 size-5 text-muted" aria-hidden /><input id="q" name="q" type="search" defaultValue={q} placeholder="Try notebooks, a pantry, or your city" className={inputClass(undefined,"min-h-14 pl-12")} /></div><button className={buttonClass("primary")} type="submit">Search</button></div>
 <details className="rounded-lg border border-line bg-surface"><summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-semibold"><SlidersHorizontal className="size-4" aria-hidden />Filter & sort{category!=="all"||status!=="open"||sort!=="deadline"?" · filters applied":""}</summary>
 <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
 <label className="space-y-1"><span className="block font-semibold">Category</span><select name="category" defaultValue={category} className={inputClass()}><option value="all">All categories</option>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
 <label className="space-y-1"><span className="block font-semibold">Status</span><select name="status" defaultValue={status} className={inputClass()}>{STATUS_CHIPS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
 <label className="space-y-1"><span className="block font-semibold">Sort by</span><select name="sort" defaultValue={sort} className={inputClass()}><option value="deadline">Soonest needed</option><option value="almost">Almost finished</option><option value="newest">Newest</option><option value="progress">Most confirmed</option></select></label>
 <button type="submit" className={buttonClass("secondary")}>Apply filters</button></div></details></form>;
}
