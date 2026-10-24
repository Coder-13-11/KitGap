import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { ClipboardCheck, ExternalLink, Globe2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { DiscoverSearch } from "@/components/discover/discover-search";
import { DriveResultCard } from "@/components/discover/drive-result-card";
import { Container } from "@/components/ui/layout-bits";
import { Reveal } from "@/components/ui/motion";
import { DISCOVER_TOPICS, FEATURED_PROGRAMS } from "@/domain/discovery";
import { seasonFor, startDriveSearch, type SectionId, type SectionResult } from "@/server/discovery/search";

export const metadata: Metadata = { title: "Discover drives near you" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string).slice(0, 80) : "");
  const place = one("place");
  const topic = one("topic");
  const searched = "place" in params || Boolean(topic);

  return (
    <div className="-mt-6 space-y-12 sm:-mt-10">
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,#234d3b_0%,#183829_70%,#12291f_100%)] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-96 rounded-full bg-[#2f6650] blur-3xl" />
        <Container className="relative py-12 sm:py-16">
          <p className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-[#d7e6dc] ring-1 ring-white/20">
            <Globe2 className="size-4" aria-hidden="true" />
            Drives from all over the web
          </p>
          <h1 className="rise mt-4 max-w-3xl font-serif text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
            Find a drive to join, wherever it was posted.
          </h1>
          <p className="rise mt-4 max-w-2xl text-lg text-[#d7e6dc]">
            We search SignUpGenius, JustServe, volunteer sites and public Facebook, Instagram and LinkedIn posts. Tap one to sign up
            on its own page.
          </p>
          <div className="rise mt-7">
            <DiscoverSearch place={place} topic={topic} topics={DISCOVER_TOPICS} />
          </div>
        </Container>
      </section>

      <Container className="space-y-12">
        {searched ? <SearchResults key={`${place}|${topic}`} place={place} topic={topic} /> : null}

        <section aria-labelledby="featured-title" className="space-y-5">
          <Reveal>
            <h2 id="featured-title" className="font-serif text-3xl font-semibold tracking-tight">
              Big drives that run every year
            </h2>
            <p className="mt-1 text-lg text-muted">National programs with local sign-ups. Each link goes to the official page.</p>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_PROGRAMS.map((p, i) => (
              <Reveal as="li" key={p.url} index={i % 3}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift group flex h-full flex-col rounded-2xl border border-line/80 bg-surface p-5 text-ink no-underline shadow-card hover:border-forest/50"
                >
                  <span className="text-sm font-semibold text-clay">{p.organizer}</span>
                  <span className="mt-1 text-lg font-semibold group-hover:underline">{p.title}</span>
                  <span className="mt-2 flex-1 text-muted">{p.text}</span>
                  <span className="mt-4 flex items-center justify-between text-sm">
                    <span className="rounded-full bg-sunken px-2.5 py-1 font-medium text-muted">{p.season}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-forest">
                      Open
                      <ExternalLink className="size-4" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
        </section>

        <p className="rounded-xl bg-sunken px-5 py-4 text-sm text-muted">
          <Sparkles className="mr-1 inline size-4 align-[-2px] text-forest" aria-hidden="true" />
          KitGap finds these pages with web search; it doesn&apos;t run them. Check the date and details on each page, and if you&apos;re
          under 18, bring a parent or teacher to any in-person event.
        </p>
      </Container>
    </div>
  );
}

const SECTIONS: { id: SectionId; title: string; where: string; icon: ReactNode }[] = [
  { id: "signups", title: "Sign-up sheets and volunteer sites", where: "SignUpGenius, JustServe, VolunteerMatch, Idealist and the Salvation Army", icon: <ClipboardCheck /> },
  { id: "social", title: "Posts on social media", where: "public Facebook, Instagram, LinkedIn and Reddit posts", icon: <MessageCircle /> },
  { id: "more", title: "More drives and events", where: "local news, event pages, churches, schools and food banks", icon: <Globe2 /> },
];

function SearchResults({ place, topic }: { place: string; topic: string }) {
  const search = startDriveSearch({ place, topic });
  const season = seasonFor(new Date());
  const what = topic ? topic.toLowerCase() : `${season.topic} drives`;
  return (
    <div className="space-y-12">
      <p className="text-lg text-muted">
        Showing <span className="font-semibold text-ink">{what}</span>
        {place ? (
          <>
            {" "}
            near <span className="font-semibold text-ink">{place}</span>
          </>
        ) : null}
        . Pick a topic above to change it.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.id} aria-labelledby={`sec-${s.id}`} className="space-y-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest-tint text-forest [&_svg]:size-5">
              {s.icon}
            </span>
            <div>
              <h2 id={`sec-${s.id}`} className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                {s.title}
              </h2>
              <p className="text-muted">From {s.where}.</p>
            </div>
          </div>
          <Suspense fallback={<SectionSkeleton label={`Searching ${s.where}…`} />}>
            <SectionList promise={search[s.id]} />
          </Suspense>
        </section>
      ))}
    </div>
  );
}

async function SectionList({ promise }: { promise: Promise<SectionResult> }) {
  const { results, failed } = await promise;
  if (results.length === 0) {
    return (
      <p className="rounded-xl bg-sunken px-5 py-4 text-muted" role="status">
        {failed
          ? "This search didn't answer. Wait a moment and search again."
          : "Nothing here yet. Try your county or a nearby big city, or another topic."}
      </p>
    );
  }
  return (
    <>
      <p className="sr-only" role="status">
        {results.length} found
      </p>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.slice(0, 12).map((r, i) => (
          <Reveal as="li" key={r.id} index={i % 3}>
            <DriveResultCard drive={r} />
          </Reveal>
        ))}
      </ul>
    </>
  );
}

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-2 text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
      <ul aria-hidden="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="space-y-3 rounded-2xl border border-line/80 bg-surface p-5 shadow-card">
            <div className="skeleton h-6 w-28 rounded-full" />
            <div className="skeleton h-6 w-4/5 rounded-md" />
            <div className="skeleton h-16 rounded-md" />
            <div className="skeleton h-11 w-40 rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}
