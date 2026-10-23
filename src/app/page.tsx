import { RequestCard } from "@/components/requests/request-card";
import { KitEquation } from "@/components/site/kit-illustration";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

const STEPS = [
  { title: "An organization posts a precise need", text: "For example, 100 school-supply kits, each with a backpack, two notebooks and a pencil pack, needed by a date." },
  { title: "A KitGap reviewer checks it", text: "Requests are listed only after a person confirms the organization's contact." },
  { title: "A school club or community group adopts part of it", text: "The group commits to a number of kits and gets the exact supply list." },
  { title: "Members pledge and the coordinator collects", text: "Pledges are promises. Only supplies the coordinator receives count as collected." },
  { title: "The group delivers and the organization confirms", text: "Progress counts only what the receiving organization confirms it received." },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const open = (await listPublicRequests(ctx, { status: "open", sort: "deadline" })).slice(0, 6);

  return (
    <div className="space-y-14">
      <Container>
        {params.signed_out ? (
          <Notice tone="success" live="polite" className="mb-6">
            You're signed out.
          </Notice>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="space-y-5">
            <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-ink sm:text-5xl">
              Turn a community need into a drive your group can complete.
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Organizations post exactly what they need. School clubs and community groups adopt a share, collect the supplies,
              and deliver them. The organization confirms what arrived, so everyone sees real progress.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/requests">Explore requests</ButtonLink>
              <a href="/demo" className="inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4 font-semibold text-forest no-underline hover:bg-forest-tint">
                Try the demo
              </a>
            </div>
            <p className="text-sm text-muted">
              Need supplies for the people you serve?{" "}
              <AppLink href="/organization/new" className="font-semibold">
                Post a request for your organization
              </AppLink>
              .
            </p>
          </div>
          <KitEquation />
        </div>
      </Container>

      <Container>
        <section aria-labelledby="open-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="open-title" className="text-2xl font-semibold">
              Open requests
            </h2>
            <AppLink href="/requests" className="font-semibold">
              See all requests
            </AppLink>
          </div>
          {open.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface px-5 py-6 text-muted">
              No requests are open for new drives right now. <a href="/demo" className="font-semibold text-forest">Try the demo</a> to see how a drive works.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((s) => (
                <li key={s.request.id}>
                  <RequestCard summary={s} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>

      <Container>
        <section aria-labelledby="how-title" className="rounded-lg border border-line bg-surface p-6 sm:p-8">
          <h2 id="how-title" className="text-2xl font-semibold">
            How a drive works
          </h2>
          <ol className="mt-5 grid gap-5 md:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="space-y-1.5">
                <span className="tabular flex size-8 items-center justify-center rounded-full bg-forest-tint font-semibold text-forest-dark">
                  {i + 1}
                </span>
                <p className="font-semibold leading-snug">{step.title}</p>
                <p className="text-sm text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            KitGap coordinates donated goods. It doesn't process payments, and money never counts as kits.{" "}
            <AppLink href="/about#how-numbers-work">How the numbers work</AppLink>
          </p>
        </section>
      </Container>
    </div>
  );
}
