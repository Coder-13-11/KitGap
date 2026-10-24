import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import { JoinedForm } from "@/components/discover/joined-form";
import { Container } from "@/components/ui/layout-bits";
import { PLATFORM_LABEL, platformFor } from "@/domain/discovery";
import { cleanTitle, cleanUrl } from "@/server/discovery/rank";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "You signed up" };

export default async function JoinedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const url = cleanUrl(one("url")) ?? "";
  const title = cleanTitle(one("title")) || "A drive you found";
  const platform = url ? platformFor(url) : "web";
  const ctx = await getAppContext();

  return (
    <Container narrow className="py-4">
      <div className="rise relative overflow-hidden rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line/80 sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-forest-tint blur-3xl" />
        <div className="relative">
          <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-2xl bg-forest text-white shadow-card">
            <PartyPopper className="size-8" />
          </span>
          <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Nice! You&apos;re in.</h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted">
            You signed up for <span className="font-semibold text-ink">{title}</span>
            {url ? ` on ${PLATFORM_LABEL[platform].replace(/ post$/, "")}` : ""}. Save it here so you remember what to bring and can mark
            it done.
          </p>
        </div>
        <div className="relative mt-8 text-left">
          {url ? (
            <JoinedForm url={url} title={title} signedIn={Boolean(ctx.user)} />
          ) : (
            <p className="text-center text-muted">We couldn&apos;t read that drive&apos;s link. Go back and open it again.</p>
          )}
        </div>
      </div>
    </Container>
  );
}
