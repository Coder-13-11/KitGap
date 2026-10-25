import { ArrowRight, ExternalLink } from "lucide-react";
import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { ExampleRequest } from "@/components/site/example-request";
import { KitJourney } from "@/components/site/kit-journey";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { Container } from "@/components/ui/layout-bits";
import { Reveal } from "@/components/ui/motion";
import { Notice } from "@/components/ui/notice";
import { FIELD_NOTES, PROOF_POINTS, REPO_URL, TEST_FACTS } from "@/content/credibility";

const FEMA = "https://www.fema.gov/disaster/recover/volunteer-donate";
const NVOAD = "https://www.nvoad.org/all_resources/donations-management/";
const NPR_NEWTOWN = "https://www.npr.org/transcripts/172608018";

const NUMBERS = [
  {
    label: "Promised",
    tone: "bg-forest-500",
    text: "A member pledged it. Useful for planning, never counted as collected.",
  },
  {
    label: "Received",
    tone: "bg-[repeating-linear-gradient(135deg,var(--color-forest)_0_4px,var(--color-forest-500)_4px_8px)]",
    text: "The coordinator checked it in, usable. Packed and handed over still isn't delivered.",
  },
  {
    label: "Confirmed",
    tone: "bg-forest",
    text: "The receiving organization said it arrived. The only number shown as done.",
  },
];

const ROLES = [
  {
    title: "I run an organization",
    text: "Post the exact items and the date. A person checks you before the request is listed, and you confirm what shows up.",
    href: "/organization/new",
    cta: "Post what you need",
  },
  {
    title: "I lead a club or group",
    text: "Run a kit drive for a shelter or school you already know, or take a share of a posted request. They confirm what arrived with a receipt link, no account needed.",
    href: "/drives/new",
    cta: "Run your own drive",
  },
  {
    title: "I was sent a link",
    text: "Open your club's invitation, pick an item that's still short, and say how many you'll bring. It takes under a minute.",
    href: "/demo",
    cta: "See how pledging works",
  },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const open = (await listPublicRequests(ctx, { status: "open", sort: "deadline" })).slice(0, 6);
  const totalTests = TEST_FACTS.unit + TEST_FACTS.integration + TEST_FACTS.browser;

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
        <Container>
          <div className="grid items-center gap-10 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] md:py-16 lg:gap-16 lg:py-20">
            <div className="rise">
              <h1 id="hero-title" className="font-serif text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
                Give what&rsquo;s actually needed.
              </h1>
              <p className="mt-5 max-w-xl text-xl text-muted">
                A shelter or school posts the exact kit it needs. Clubs each take a share, collect it, and hand it over. Only what the
                organization confirms counts as done.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AppLink href="/demo" className={buttonClass("primary")}>
                  Try the two-minute demo
                </AppLink>
                <AppLink href="/requests" className={buttonClass("secondary")}>
                  Explore requests
                </AppLink>
              </div>
              <p className="mt-4 text-sm">
                On your phone? <AppLink href="/install">Install KitGap</AppLink> to your home screen.
              </p>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-forest" />
                  Every request checked by a person
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-forest" />
                  Goods only, never money
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-forest" />
                  No names on public pages
                </li>
              </ul>
            </div>
            <div className="rise" style={{ animationDelay: "120ms" }}>
              <KitJourney />
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="problem-title" className="border-y border-line bg-sunken">
        <Container className="py-16 sm:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <Reveal>
              <h2 id="problem-title" className="max-w-[20ch] font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
                Generosity piles up when nobody asks first.
              </h2>
              <div className="mt-6 max-w-2xl space-y-4 text-lg">
                <p>
                  Disaster responders have a name for donations nobody requested: a second disaster. FEMA asks people to confirm what&rsquo;s
                  needed before they send goods, and National VOAD warns that unrequested items cost a community time and storage it
                  doesn&rsquo;t have.
                </p>
                <p>
                  The fix isn&rsquo;t less generosity. It&rsquo;s a list from the people receiving it, split into shares a club can
                  actually finish.
                </p>
              </div>
              <p className="mt-6 flex flex-col gap-2 text-base sm:flex-row sm:flex-wrap sm:gap-x-6">
                <a href={FEMA}>FEMA: Volunteer and donate responsibly</a>
                <a href={NVOAD}>National VOAD: Donations management</a>
              </p>
            </Reveal>
            <Reveal index={1}>
              <figure className="tag-shape border border-line-strong bg-surface p-6 shadow-card sm:p-7">
                <p className="tabular font-serif text-6xl leading-none font-semibold tracking-tight text-clay sm:text-7xl">63,000+</p>
                <p className="mt-3 font-serif text-2xl font-semibold tracking-tight">teddy bears sent to Newtown, Connecticut</p>
                <blockquote className="mt-3 text-muted">
                  After the 2012 shooting, more than a quarter-million cards, letters and gifts arrived, outgrew the town&rsquo;s storage and
                  filled a warehouse. Kindness, with nobody to ask what was needed.
                </blockquote>
                <figcaption className="mt-4 border-t border-line pt-3 text-sm text-muted">
                  Source: <a href={NPR_NEWTOWN}>NPR, February 2013</a>, quoting Newtown&rsquo;s tax assessor.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </Container>
      </section>

      <section aria-labelledby="numbers-title">
        <Container className="py-16 sm:py-24">
          <Reveal>
            <h2 id="numbers-title" className="max-w-[22ch] font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
              Three numbers, and only one means done.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Most drives count promises. KitGap keeps them apart, so a club, a parent and the organization all read the same truth.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {NUMBERS.map((n, i) => (
              <Reveal as="li" key={n.label} index={i} className="tag-shape lift border border-line-strong bg-surface p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span aria-hidden className={`h-3 w-10 rounded-[2px_6px_6px_2px] ${n.tone}`} />
                  <span className="tabular text-sm font-semibold text-muted">{i + 1} of 3</span>
                </div>
                <h3 className="mt-4 font-serif text-3xl font-semibold tracking-tight">{n.label}</h3>
                <p className="mt-2 text-muted">{n.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="roles-title" className="border-t border-line">
        <Container className="py-16 sm:py-24">
          <Reveal>
            <h2 id="roles-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
              Where you come in
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ROLES.map((role, i) => (
              <Reveal
                key={role.title}
                index={i}
                className="tag-shape lift flex flex-col border border-line-strong bg-surface p-6 shadow-card sm:p-7"
              >
                <h3 className="font-serif text-2xl font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-3 flex-1 text-muted">{role.text}</p>
                <AppLink href={role.href} className="mt-6 inline-flex min-h-11 items-center gap-2 self-start font-semibold">
                  {role.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </AppLink>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="proof-title" className="bg-ink text-white">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <Reveal>
              <h2 id="proof-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
                Built to be checked.
              </h2>
              <p className="mt-4 text-lg text-eyebrow">
                Trust shouldn&rsquo;t rest on a nice page. These rules are enforced in code, and each one has a test that fails if it breaks.
              </p>
              <p className="mt-8 font-serif text-6xl leading-none font-semibold tracking-tight">{totalTests}</p>
              <p className="mt-2 text-eyebrow">
                automated tests ({TEST_FACTS.unit} unit, {TEST_FACTS.integration} database, {TEST_FACTS.browser} browser and accessibility),
                as of {TEST_FACTS.asOf}.
              </p>
              {REPO_URL ? (
                <a href={REPO_URL} className={`${buttonClass("inverse")} mt-8`}>
                  Read the code
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PROOF_POINTS.map((p, i) => (
                <Reveal as="li" key={p.title} index={i} className="rounded-[2px_14px_14px_2px] border border-white/15 bg-white/5 p-6">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 text-eyebrow">{p.text}</p>
                  <p className="mt-4 font-mono text-sm text-eyebrow">{p.where}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {FIELD_NOTES.length > 0 ? (
        <section aria-labelledby="notes-title" className="border-b border-line">
          <Container className="py-16 sm:py-24">
            <Reveal>
              <h2 id="notes-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
                From people who tried it
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-muted">Real quotes, shared with permission, from testing sessions.</p>
            </Reveal>
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FIELD_NOTES.map((note, i) => (
                <Reveal as="li" key={note.quote} index={i} className="tag-shape flex flex-col border border-line-strong bg-surface p-6 shadow-card">
                  <blockquote className="flex-1 font-serif text-xl leading-snug">&ldquo;{note.quote}&rdquo;</blockquote>
                  <p className="mt-5 font-semibold">{note.attribution}</p>
                  <p className="text-sm text-muted">
                    {note.context} · {note.date}
                  </p>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="open-title">
        <Container className="py-16 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Reveal>
              <h2 id="open-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
                {open.length === 0 ? "What a request looks like" : "Open requests"}
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-muted">
                {open.length === 0
                  ? "Requests appear here once a person has checked them. Until the first one is listed, here is a sample."
                  : "Needs a person has checked, still open for a group to take."}
              </p>
            </Reveal>
            {open.length > 0 ? (
              <AppLink href="/requests" className="font-semibold">
                See every request
              </AppLink>
            ) : null}
          </div>
          {open.length === 0 ? (
            <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <Reveal>
                <ExampleRequest />
              </Reveal>
              <Reveal index={1} className="lg:pt-2">
                <p className="max-w-md text-lg">Know a shelter, pantry, or school with a real list? The first request can be theirs.</p>
                <AppLink href="/organization/new" className={`${buttonClass("secondary")} mt-5`}>
                  Post what you need
                </AppLink>
              </Reveal>
            </div>
          ) : (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((summary, i) => (
                <Reveal as="li" key={summary.request.id} index={i % 3}>
                  <RequestCard summary={summary} />
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <section aria-labelledby="close-title" className="border-t border-line">
        <Container className="py-16 text-center sm:py-20">
          <Reveal>
            <h2 id="close-title" className="mx-auto max-w-[24ch] font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
              Watch one drive go from list to confirmed.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              The demo gives you a private copy with four sample people. A short guide walks you through every side in about two minutes.
            </p>
            <AppLink href="/demo" className={`${buttonClass("primary")} mt-8`}>
              Start the guided demo
            </AppLink>
            <p className="mt-6 text-sm text-muted">
              KitGap coordinates donated goods. It does not collect or track money.{" "}
              <AppLink href="/about#how-numbers-work">How the numbers work</AppLink>
            </p>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
