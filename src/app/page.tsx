import { ArrowRight } from "lucide-react";
import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { DriveSnapshot } from "@/components/site/drive-snapshot";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { Container } from "@/components/ui/layout-bits";
import { Reveal } from "@/components/ui/motion";
import { Notice } from "@/components/ui/notice";
import { FIELD_NOTES, TEST_FACTS } from "@/content/credibility";

const FEMA = "https://www.fema.gov/disaster/recover/volunteer-donate";
const NVOAD = "https://www.nvoad.org/all_resources/donations-management/";

// Every section shares one container, one heading size and one 3-column
// grid, so left edges and columns line up all the way down the page.
const SECTION = "border-t border-line py-16 sm:py-20";
const H2 = "font-serif text-3xl font-semibold tracking-tight sm:text-4xl";
const GRID = "mt-8 grid gap-5 md:grid-cols-3";
const CARD = "tag-shape flex flex-col border border-line-strong bg-surface p-6 shadow-card";

const STEPS = [
  { title: "Get the list", text: "Take a share of a shelter's posted request, or add the list from one you already know." },
  { title: "Collect it together", text: "Members say what they'll bring. You check in what arrives and pack complete kits." },
  { title: "They confirm it", text: "The shelter confirms what arrived. Only that counts as done." },
];

const ROLES = [
  {
    title: "Clubs and groups",
    text: "Run a kit drive with a shared checklist, member pledges and a packing sheet.",
    href: "/drives/new",
    cta: "Start a drive",
  },
  {
    title: "Shelters, pantries and schools",
    text: "Post exactly what you need, so you get that and nothing else.",
    href: "/organization/new",
    cta: "Post what you need",
  },
  {
    title: "Members and parents",
    text: "Open your club's link, pick an item that's still short, and say how many you'll bring.",
    href: "/demo",
    cta: "See how it works",
  },
];

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
        <Container className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:py-20 lg:gap-16">
          <div className="rise">
            <h1 id="hero-title" className="max-w-[16ch] font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Donation drives for exactly what a shelter needs.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              Your club gets a shelter&rsquo;s list, collects it together, and drops it off. The shelter confirms what arrived.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AppLink href="/drives/new" className={buttonClass("primary")}>
                Start a drive
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

      <section aria-labelledby="how-title" className={SECTION}>
        <Container>
          <h2 id="how-title" className={H2}>
            How it works
          </h2>
          <ol className={GRID}>
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} index={i} className={CARD}>
                <span className="tabular grid size-10 place-items-center rounded-full bg-forest font-serif text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-muted">{step.text}</p>
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
                <h3 className="font-serif text-2xl font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-2 flex-1 text-muted">{role.text}</p>
                <AppLink href={role.href} className="mt-5 inline-flex min-h-11 items-center gap-2 self-start font-semibold">
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
              Donations nobody asked for pile up and cost shelters time and storage. FEMA and National VOAD both ask people to check what&rsquo;s
              needed before giving. KitGap starts every drive from that list.
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
          <div className="flex flex-wrap gap-3">
            <AppLink href="/demo" className={buttonClass("primary")}>
              Try the demo
            </AppLink>
            <AppLink href="/drives/new" className={buttonClass("secondary")}>
              Start a drive
            </AppLink>
          </div>
        </Container>
      </section>
    </div>
  );
}
