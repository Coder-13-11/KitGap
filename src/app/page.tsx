import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { DriveSnapshot } from "@/components/site/drive-snapshot";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { CategoryTile } from "@/components/ui/category";
import { Container } from "@/components/ui/layout-bits";
import type { Category } from "@/domain/types";
import { Notice } from "@/components/ui/notice";

const FEMA = "https://www.fema.gov/disaster/recover/volunteer-donate";

const HOME_CATEGORIES: Category[] = ["food", "school_supplies", "seniors", "pets", "hygiene", "winter"];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const open = (await listPublicRequests(ctx, { status: "open", sort: "deadline" })).slice(0, 6);

  return (
    <div className="-mt-6 sm:-mt-10">
      {params.signed_out ? (
        <Container className="pt-6">
          <Notice tone="success" live="polite">
            You're signed out.
          </Notice>
        </Container>
      ) : null}

      <section aria-labelledby="hero-title">
        <Container className="grid items-center gap-8 py-8 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-10 md:py-16 lg:gap-16">
          <div>
            <h1 id="hero-title" className="max-w-[17ch] font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
              Give what your community actually needs.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted sm:mt-5">
              Local food pantries, shelters, schools and senior homes post exactly what they need. You bring it, and they confirm it
              arrived.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <AppLink href="/requests" className={buttonClass("primary")}>
                Find a need
              </AppLink>
              <AppLink href="/demo" className={buttonClass("secondary")}>
                Try the demo
              </AppLink>
            </div>
          </div>
          <DriveSnapshot />
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

      <section aria-labelledby="how-title" className="border-t border-line py-10 sm:py-14">
        <Container className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h2 id="how-title" className="font-serif text-3xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="mt-5 list-decimal space-y-3 pl-6 text-lg marker:font-semibold marker:text-forest">
              <li>A pantry, shelter or school posts the exact list of what it needs.</li>
              <li>You pick how much you&rsquo;ll bring, then drop it off.</li>
              <li>They confirm what arrived. Only confirmed items count.</li>
            </ol>
          </div>
          <div className="space-y-4 text-lg">
            <p>
              Donations nobody asked for pile up and cost these places time and storage, which is why{" "}
              <a href={FEMA}>FEMA</a> asks people to check what&rsquo;s needed before giving. KitGap starts from the list.
            </p>
            <p>
              Run a pantry, shelter or school? <AppLink href="/organization/new">Post what you need</AppLink>. Leading a club?{" "}
              <AppLink href="/drives/new">Run your own drive</AppLink>.
            </p>
          </div>
        </Container>
      </section>

      {open.length > 0 ? (
        <section aria-labelledby="open-title" className="border-t border-line py-10 sm:py-14">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="open-title" className="font-serif text-3xl font-semibold tracking-tight">
                Open needs
              </h2>
              <AppLink href="/requests" className="font-semibold">
                See all
              </AppLink>
            </div>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {open.map((summary) => (
                <li key={summary.request.id}>
                  <RequestCard summary={summary} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </div>
  );
}
