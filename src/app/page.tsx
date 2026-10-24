import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { ExampleRequest } from "@/components/site/example-request";
import { DrivePlanner } from "@/components/site/drive-planner";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { Container } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";

const STEPS = [
  {
    title: "Post the list",
    text: "An organization names the items and the date. A person checks the organization before the request is listed.",
  },
  {
    title: "Take a share",
    text: "A group picks a number of kits. The supply checklist is that number times the recipe. Bring only what is listed.",
  },
  {
    title: "Confirm what arrived",
    text: "Packed is not received. The count moves when the organization says the goods arrived.",
  },
];

const FEMA = "https://www.fema.gov/disaster/recover/volunteer-donate";
const NVOAD = "https://www.nvoad.org/all_resources/donations-management/";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const open = (await listPublicRequests(ctx, { status: "open", sort: "deadline" })).slice(0, 6);

  return (
    <div>
      {params.signed_out ? (
        <Container className="pt-6">
          <Notice tone="success" live="polite">
            You're signed out.
          </Notice>
        </Container>
      ) : null}

      <section aria-labelledby="hero-title">
        <Container>
          <div className="grid items-center gap-8 py-8 md:grid-cols-2 md:gap-10 md:py-14 lg:gap-16 lg:py-16">
            <div>
              <h1 id="hero-title" className="font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Give what's actually needed.
              </h1>
              <p className="mt-4 max-w-md text-lg text-muted">
                An organization posts the list. A club takes a share, packs it, and hands it over. The number on the tag moves
                only when the organization confirms what arrived.
              </p>
            </div>
            <DrivePlanner />
          </div>
        </Container>
      </section>

      <section aria-labelledby="paths-title" className="border-t border-line">
        <Container className="py-14 sm:py-20">
          <h2 id="paths-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Where you start
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="tag-shape flex flex-col bg-forest p-6 text-white shadow-card sm:p-8">
              <h3 className="font-serif text-3xl font-semibold tracking-tight">I run an organization</h3>
              <p className="mt-3 max-w-md flex-1 text-lg text-eyebrow">
                Post the items and the date. Groups take shares of that list, and you confirm what shows up.
              </p>
              <AppLink href="/organization/new" className={`${buttonClass("inverse")} mt-8 self-start`}>
                Post what you need
              </AppLink>
            </article>
            <article className="tag-shape flex flex-col border border-line-strong bg-surface p-6 shadow-card sm:p-8">
              <h3 className="font-serif text-3xl font-semibold tracking-tight">I lead a club or group</h3>
              <p className="mt-3 max-w-md flex-1 text-lg text-muted">
                Choose a request, take a number of kits your group can finish, and collect only what the list asks for.
              </p>
              <AppLink href="/requests" className={`${buttonClass("primary")} mt-8 self-start`}>
                Start a drive
              </AppLink>
            </article>
          </div>
        </Container>
      </section>

      <section aria-labelledby="how-title" className="border-t border-line">
        <Container className="py-14 sm:py-20">
          <h2 id="how-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">Three steps. The order is the point.</p>
          <ol className="tag-shape mt-8 divide-y divide-line border border-line-strong bg-surface shadow-card">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid gap-2 px-5 py-5 sm:grid-cols-[3rem_minmax(0,16rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6 sm:px-6">
                <span className="tabular font-serif text-3xl leading-none font-semibold text-forest">{index + 1}</span>
                <p className="font-serif text-xl font-semibold tracking-tight">{step.title}</p>
                <p className="text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="why-title" className="bg-sunken">
        <Container className="py-14 sm:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <h2 id="why-title" className="max-w-[18ch] font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Why requests instead of random donations
              </h2>
              <div className="mt-6 max-w-2xl space-y-4 text-lg">
                <p>
                  FEMA's guidance on volunteering and donating asks people to confirm what is needed before they send goods.
                  National VOAD's donations guidance warns that unrequested items can become a second disaster for a community
                  already in trouble.
                </p>
                <p>
                  A KitGap drive starts from the organization's own list. A pledge is a promise, not a delivery. Only what the
                  organization confirms counts as received.
                </p>
                <p className="flex flex-col gap-2 text-base sm:flex-row sm:flex-wrap sm:gap-x-6">
                  <a href={FEMA}>FEMA: Volunteer and Donate</a>
                  <a href={NVOAD}>National VOAD: Donations management</a>
                </p>
              </div>
            </div>
            <figure>
              <img
                src="/photos/backpack.jpg"
                alt="A black backpack standing on a pale floor in daylight."
                width="1400"
                height="1867"
                className="tag-shape aspect-[3/4] w-full object-cover"
              />
              <figcaption className="mt-2 text-sm text-muted">
                Backpack. Photograph by <a href="https://unsplash.com/photos/_H0fjILH5Vw">Sun Lingyan</a> on Unsplash.
              </figcaption>
            </figure>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <figure>
              <img
                src="/photos/notebooks.jpg"
                alt="A spiral notebook on a white desk, with a pen, a ruler, and a keyboard."
                width="1400"
                height="1867"
                className="tag-shape aspect-[4/3] w-full object-cover"
              />
              <figcaption className="mt-2 text-sm text-muted">
                Notebooks. Photograph by <a href="https://unsplash.com/photos/vdaJJbls3xE">Marissa Grootes</a> on Unsplash.
              </figcaption>
            </figure>
            <figure>
              <img
                src="/photos/pencils.jpg"
                alt="A row of sharpened colored pencils on a white surface."
                width="1400"
                height="1050"
                className="tag-shape aspect-[4/3] w-full object-cover"
              />
              <figcaption className="mt-2 text-sm text-muted">
                Pencils. Photograph by <a href="https://unsplash.com/photos/l3N9Q27zULw">Jess Bailey</a> on Unsplash.
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <section aria-labelledby="open-title">
        <Container className="py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="open-title" className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Open requests
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-muted">
                {open.length === 0
                  ? "No live requests yet. When an organization posts a need, it is listed here."
                  : "Needs a person has checked, still open for a group to take."}
              </p>
            </div>
            {open.length > 0 ? (
              <AppLink href="/requests" className="font-semibold">
                See every request
              </AppLink>
            ) : null}
          </div>
          {open.length === 0 ? (
            <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <ExampleRequest />
              <div className="lg:pt-2">
                <p className="max-w-md text-lg">
                  Know a shelter, pantry, or school with a real list? The first request can be theirs.
                </p>
                <AppLink href="/organization/new" className={`${buttonClass("primary")} mt-5`}>
                  Post what you need
                </AppLink>
              </div>
            </div>
          ) : (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((summary) => (
                <li key={summary.request.id}>
                  <RequestCard summary={summary} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 max-w-2xl text-sm text-muted">
            KitGap coordinates donated goods. It does not collect or track money.{" "}
            <AppLink href="/about#how-numbers-work">How the numbers work</AppLink>
          </p>
        </Container>
      </section>
    </div>
  );
}
