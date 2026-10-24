"use client";

import { useState } from "react";
import { ArrowUpRight, Camera, Gift, PartyPopper } from "lucide-react";
import { updateExternalSignupAction } from "@/actions/discover";
import { ActionForm } from "../ui/action-form";
import { AppLink } from "../ui/base";
import { SubmitButton } from "../ui/button";
import { inputClass } from "../ui/field";

export interface ElsewhereItem {
  id: string;
  url: string;
  title: string;
  platformLabel: string;
  status: "signed_up" | "donated" | "cancelled";
  plan: string;
  itemsGiven: number | null;
}

export function ElsewhereList({ items }: { items: ElsewhereItem[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <ElsewhereCard item={item} />
        </li>
      ))}
    </ul>
  );
}

function ElsewhereCard({ item }: { item: ElsewhereItem }) {
  const [giving, setGiving] = useState(false);
  const done = item.status === "donated";
  return (
    <article className="lift flex h-full flex-col rounded-2xl border border-line/80 bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-bold">{item.platformLabel}</span>
        <span className={done ? "inline-flex items-center gap-1 text-sm font-semibold text-forest" : "text-sm font-semibold text-clay"}>
          {done ? <PartyPopper className="size-4" aria-hidden="true" /> : null}
          {done ? "Donated" : "Signed up"}
        </span>
      </div>
      <h3 className="mt-3 text-lg leading-snug font-semibold">{item.title}</h3>
      {item.plan ? (
        <p className="mt-1 text-muted">
          <span className="font-semibold text-ink">Bringing:</span> {item.plan}
        </p>
      ) : null}
      {done && item.itemsGiven !== null ? (
        <p className="mt-1 text-muted">
          <span className="font-semibold text-ink">Gave:</span> {item.itemsGiven.toLocaleString("en-US")} items
        </p>
      ) : null}
      <div className="flex-1" />

      {giving ? (
        <ActionForm action={updateExternalSignupAction} hidden={{ id: item.id, status: "donated" }} success="Marked as donated. Thank you!" className="appear mt-4 space-y-3">
          {(errors, idFor) => (
            <>
              <label htmlFor={idFor("itemsGiven")} className="font-semibold">
                How many items did you give? <span className="font-normal text-muted">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input id={idFor("itemsGiven")} name="itemsGiven" inputMode="numeric" className={inputClass(errors.itemsGiven, "w-28")} />
                <SubmitButton>Save</SubmitButton>
              </div>
              <AppLink href="/tools" className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Camera className="size-4" aria-hidden="true" />
                Count them with a photo
              </AppLink>
            </>
          )}
        </ActionForm>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {!done ? (
            <button
              type="button"
              onClick={() => setGiving(true)}
              className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white hover:bg-forest-dark"
            >
              <Gift className="size-4" aria-hidden="true" />I dropped it off
            </button>
          ) : null}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line-strong px-4 font-semibold text-ink no-underline hover:bg-sunken"
          >
            Open page
            <ArrowUpRight className="size-4" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      )}
    </article>
  );
}
