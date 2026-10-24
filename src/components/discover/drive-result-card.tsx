"use client";

import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, MapPin } from "lucide-react";
import { PLATFORM_LABEL, type PlatformId } from "@/domain/discovery";
import { AppLink } from "../ui/base";
import { cn } from "../ui/cn";

export interface DriveCardData {
  id: string;
  url: string;
  title: string;
  summary: string;
  platform: PlatformId;
  publishedAt: string | null;
  near: boolean;
  stale: boolean;
}

const PLATFORM_STYLE: Partial<Record<PlatformId, string>> = {
  signupgenius: "bg-[#e8f3e0] text-[#2f5a17]",
  justserve: "bg-[#e3eef8] text-[#1e4f7a]",
  facebook: "bg-[#e7edfa] text-[#1d3f8f]",
  instagram: "bg-[#fbe8f1] text-[#8a1f52]",
  linkedin: "bg-[#e3eef7] text-[#0a4d84]",
  salvation_army: "bg-[#fbe9e7] text-[#8f1f14]",
};

function postedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Posted ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

export function DriveResultCard({ drive }: { drive: DriveCardData }) {
  const [asked, setAsked] = useState(false);
  const label = PLATFORM_LABEL[drive.platform];
  const posted = postedLabel(drive.publishedAt);
  const joinedHref = `/discover/joined?${new URLSearchParams({ url: drive.url, title: drive.title, platform: drive.platform }).toString()}`;

  return (
    <article className="lift flex h-full flex-col rounded-2xl border border-line/80 bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", PLATFORM_STYLE[drive.platform] ?? "bg-sunken text-ink")}>{label}</span>
        {drive.near ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-tint px-2.5 py-1 text-xs font-bold text-forest">
            <MapPin className="size-3.5" aria-hidden="true" />
            Near you
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg leading-snug font-semibold break-words">{drive.title}</h3>
      {drive.summary ? <p className="mt-2 line-clamp-4 flex-1 text-[0.95rem] text-muted">{drive.summary}</p> : <div className="flex-1" />}
      {posted ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays className="size-4" aria-hidden="true" />
          {posted}
          {drive.stale ? <span className="font-semibold text-clay">· older post, check it&apos;s still on</span> : null}
        </p>
      ) : null}

      {asked ? (
        <div className="appear mt-4 rounded-xl bg-forest-tint p-4" role="group" aria-labelledby={`asked-${drive.id}`}>
          <p id={`asked-${drive.id}`} className="font-semibold text-forest-dark">
            Did you sign up?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppLink
              href={joinedHref}
              className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white no-underline hover:bg-forest-dark"
            >
              <Check className="size-4" aria-hidden="true" />
              Yes, I signed up
            </AppLink>
            <button
              type="button"
              onClick={() => setAsked(false)}
              className="press min-h-11 rounded-lg border border-forest/30 bg-white px-4 font-semibold text-forest hover:bg-forest-tint"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <a
          href={drive.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => setTimeout(() => setAsked(true), 400)}
          className="press mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white no-underline hover:bg-forest-dark"
        >
          Open and sign up on {label.replace(/ post$/, "")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
