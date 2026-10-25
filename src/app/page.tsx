import { ArrowRight, BadgeCheck, PackageCheck, Search } from "lucide-react";
import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { DriveSnapshot } from "@/components/site/drive-snapshot";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { CategoryTile } from "@/components/ui/category";
import { Container } from "@/components/ui/layout-bits";
import type { Category } from "@/domain/types";
import { Reveal } from "@/components/ui/motion";
import { Notice } from "@/components/ui/notice";
import { FIELD_NOTES, TEST_FACTS } from "@/content/credibility";

const FEMA = "https://www.fema.gov/disaster/recover/volunteer-donate";
const NVOAD = "https://www.nvoad.org/all_resources/donations-management/";

// Every section shares one container, one heading size and one 3-column
// grid, so left edges and columns line up all the way down the page.
const SECTION = "border-t border-line py-10 sm:py-16 md:py-20";
const H2 = "font-serif text-3xl font-semibold tracking-tight sm:text-4xl";
const GRID = "mt-5 grid gap-3 sm:mt-8 sm:gap-5 md:grid-cols-3";
const CARD = "tag-shape flex flex-col border border-line-strong bg-surface p-4 shadow-card sm:p-6";

const STEPS = [
  { title: "Find a need", text: "See what food pantries, shelters, schools and senior homes near you are asking for.", Icon: Search },
  { title: "Bring what's on the list", text: "Say what you'll bring, then drop it off. Only what they asked for, nothing extra.", Icon: PackageCheck },
  { title: "See it confirmed", text: "The organization confirms what arrived, so you know your gift got there.", Icon: BadgeCheck },
];

const ROLES = [
  {
    title: "Community organizations",
    text: "Food pantries, shelters, schools, senior homes and animal shelters. Post exactly what you need and share it in one tap.",
    href: "/organization/new",
    cta: "Post what you need",
  },
  {
    title: "Neighbors and families",
    text: "Find a need near you, say what you'll bring, and see it confirmed when it arrives.",
    href: "/requests",
    cta: "Find a need",
  },
  {
    title: "School clubs",
    text: "Run a drive with your club: one shared list, member pledges and a packing sheet.",
    href: "/drives/new",
    cta: "Start a drive",
  },
];

const HOME_CATEGORIES: Category[] = ["food", "school_supplies", "seniors", "pets", "hygiene", "winter"];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const open = (await listPublicRequests(ctx, { status: "open", sort: "deadline" })).slice(0, 6);
  const totalTests = TEST_FACTS.unit + TEST_FACTS.integration + TEST_FACTS.browser;

  const facts = [
    "Every listed request is checked by a person",
    "Goods only. KitGap never handles money",
    "No names on public pages",
    `${totalTests} automated tests`,
  ];

  return (
    <div className="-mt-6 -mb-10 sm:-mt-10">
      {params.signed_out ? (
        <Container className="pt-6">
          <Notice tone="success" live="polite">
            You're signed out.
          </Notice>
        </Container>
      ) : null}

      <section aria-labelledby="hero-title">
        <Container className="grid items-center gap-8 py-8 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-10 md:py-20 lg:gap-16">
          <div className="rise">
            <h1 id="hero-title" className="max-w-[17ch] font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Help your community get exactly what it needs.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted sm:mt-5 sm:text-xl">
              Local food pantries, shelters, schools and senior homes post what they need. You bring it. They confirm it arrived.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <AppLink href="/requests" className={buttonClass("primary")}>
                Find a need
              </AppLink>
              <AppLink href="/demo" className={buttonClass("secondary")}>
                Try the demo
              </AppLink>
            </div>
            <p className="mt-4 text-sm text-muted">
              Free. Works on any phone: <AppLink href="/install">install the app</AppLink>.
            </p>
          </div>
          <div className="rise" style={{ animationDelay: "120ms" }}>
            <DriveSnapshot />
          </div>
        </Container>
      </section>

      <nav aria-label="Kinds of need" className="border-t border-line">
        <Container className="py-6 sm:py-8">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {HOME_CATEGORIES.map((c) => (
              <li key={c}>
                <AppLink href={`/requests?category=${c}`} className="block rounded-xl py-2 no-underline hover:bg-sunken">
                  <CategoryTile category={c} />
                </AppLink>
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      <section aria-labelledby="how-title" className={SECTION}>
        <Container>
          <h2 id="how-title" className={H2}>
            How it works
          </h2>
          <ol className={GRID}>
            {STEPS.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                index={i}
                className={`${CARD} grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 sm:flex`}
              >
                <span aria-hidden className="row-span-2 grid size-9 place-items-center rounded-full bg-forest text-white sm:size-11">
                  <step.Icon className="size-5" />
                </span>
                <h3 className="font-serif text-xl font-semibold tracking-tight sm:mt-4 sm:text-2xl">{step.title}</h3>
                <p className="mt-1 text-muted sm:mt-2">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="who-title" className={SECTION}>
        <Container>
          <h2 id="who-title" className={H2}>
            Who it&rsquo;s for
          </h2>
          <div className={GRID}>
            {ROLES.map((role, i) => (
              <Reveal key={role.title} index={i} className={CARD}>
                <h3 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">{role.title}</h3>
                <p className="mt-1 flex-1 text-muted sm:mt-2">{role.text}</p>
                <AppLink href={role.href} className="mt-2 inline-flex min-h-11 items-center gap-2 self-start font-semibold sm:mt-5">
                  {role.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </AppLink>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="why-title" className={`${SECTION} bg-sunken`}>
        <Container className="grid gap-8 md:grid-cols-3 md:gap-5">
          <div className="md:col-span-2">
            <h2 id="why-title" className={H2}>
              Why a list
            </h2>
            <p className="mt-4 max-w-2xl text-lg">
              Donations nobody asked for pile up and cost pantries and shelters time and storage. FEMA and National VOAD both ask people to
              check what&rsquo;s needed before giving. Every need on KitGap starts from the organization&rsquo;s own list.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <a href={FEMA}>FEMA guidance</a>
              <a href={NVOAD}>National VOAD guidance</a>
            </p>
          </div>
          <ul className="space-y-3 self-center">
            {facts.map((fact) => (
              <li key={fact} className="flex items-start gap-3 font-semibold">
                <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-forest" />
                {fact}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {FIELD_NOTES.length > 0 ? (
        <section aria-labelledby="notes-title" className={SECTION}>
          <Container>
            <h2 id="notes-title" className={H2}>
              From people who tried it
            </h2>
            <ul className={GRID}>
              {FIELD_NOTES.map((note) => (
                <li key={note.quote} className={CARD}>
                  <blockquote className="flex-1 text-lg">&ldquo;{note.quote}&rdquo;</blockquote>
                  <p className="mt-4 font-semibold">{note.attribution}</p>
                  <p className="text-sm text-muted">
                    {note.context} · {note.date}
                  </p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {open.length > 0 ? (
        <section aria-labelledby="open-title" className={SECTION}>
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="open-title" className={H2}>
                Open requests
              </h2>
              <AppLink href="/requests" className="font-semibold">
                See every request
              </AppLink>
            </div>
            <ul className={GRID}>
              {open.map((summary) => (
                <li key={summary.request.id}>
                  <RequestCard summary={summary} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="start-title" className={`${SECTION} bg-surface`}>
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="start-title" className={H2}>
              See a whole drive in two minutes.
            </h2>
            <p className="mt-2 text-lg text-muted">The demo uses fictional sample people. Nothing in it is real.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <AppLink href="/demo" className={buttonClass("primary")}>
              Try the demo
            </AppLink>
            <AppLink href="/requests" className={buttonClass("secondary")}>
              Find a need
            </AppLink>
          </div>
        </Container>
      </section>
    </div>
  );
}
