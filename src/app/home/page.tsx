import { ArrowRight, Building2, HandHeart, Search } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { RequestCard } from "@/components/requests/request-card";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, Panel } from "@/components/ui/layout-bits";
import { Pill } from "@/components/ui/status";
import { homeNextStep, type HomeDrive, type HomeOrg } from "@/domain/onboarding";
import { countNoun, formatCount } from "@/domain/text";
import { getMyDrives, type MyDriveItem } from "@/server/queries/drives";
import { getMyWorkspaces, getOrgDashboard, type OrgDashboard } from "@/server/queries/organization";
import { listPublicRequests } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Home" };

// Where people land after signing in. Three things only: what to do next,
// needs near you, and what you're already helping with. Updates and your
// organizations are one tap away under Profile.
export default async function HomePage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/home${ctx.sessionExpired ? "&expired=1" : ""}`);
  const [{ drives }, workspaces, nearby] = await Promise.all([
    getMyDrives(ctx),
    getMyWorkspaces(ctx),
    listPublicRequests(ctx, { status: "open", sort: "deadline" }),
  ]);
  const dashboards = (await Promise.all(workspaces.organizations.slice(0, 3).map((o) => getOrgDashboard(ctx, o.id)))).filter(
    (d): d is OrgDashboard => !!d && d !== "not_allowed",
  );

  const homeDrives: HomeDrive[] = drives.map((d) => ({
    commitmentId: d.commitmentId,
    requestTitle: d.requestTitle,
    role: d.role,
    active: d.status === "active",
    nextStep: d.nextStep,
    myOpenPledges: d.myOpenPledges,
    pledgeCount: d.pledgeCount,
    collectedItems: d.collectedItems,
    built: Math.max(0, d.quantity - d.toBuild),
    isKit: d.requestType === "kit",
  }));
  const homeOrgs: HomeOrg[] = dashboards.map((d) => ({
    id: d.org.id,
    name: d.org.name,
    pendingDeliveries: d.pendingDeliveries.length,
    requests: d.requests.map((r) => ({ status: r.status })),
    hasContact: !!(d.org.contactName && (d.org.contactEmail || d.org.contactPhone)),
  }));
  const next = homeNextStep(homeDrives, homeOrgs);
  const active = drives.filter((d) => d.status === "active");
  const first = ctx.user.displayName.split(" ")[0];
  const nothingYet = drives.length === 0 && dashboards.length === 0;

  return (
    <Container className="space-y-8 sm:space-y-10">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-[2.25rem]">Hi, {first}</h1>
        <p className="mt-1 text-lg text-muted">{nothingYet ? "Where would you like to start?" : "Here's what's next."}</p>
      </header>

      {nothingYet ? (
        <ul className="grid gap-3 md:grid-cols-3">
          <Start
            href="/requests"
            icon={<Search />}
            title="Find a need near you"
            text="Food pantries, shelters, schools, senior homes and animal shelters."
            primary
          />
          <Start href="/organization/new" icon={<Building2 />} title="Add your organization" text="Post exactly what the people you serve need." />
          <Start href="/drives/new" icon={<HandHeart />} title="Start a drive" text="Collect for a place you know, with your club or friends." />
        </ul>
      ) : next.urgency === "now" ? (
        <section aria-labelledby="next-title" className="tag-shape bg-forest p-5 text-white shadow-card sm:p-7">
          <p className="text-sm font-semibold text-eyebrow">Next step</p>
          <h2 id="next-title" className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {next.title}
          </h2>
          <p className="mt-1 max-w-2xl text-eyebrow">{next.detail}</p>
          <ButtonLink href={next.href} variant="inverse" className="mt-4">
            {next.label} <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </section>
      ) : (
        <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold tracking-tight">{next.title}</h2>
            <p className="mt-1 text-muted">{next.detail}</p>
          </div>
          <ButtonLink href={next.href} variant="secondary">
            {next.label}
          </ButtonLink>
        </Panel>
      )}

      {active.length > 0 || dashboards.length > 0 ? (
        <section aria-labelledby="giving-title" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 id="giving-title" className="font-serif text-2xl font-semibold tracking-tight">
              What you&rsquo;re helping with
            </h2>
            <AppLink href="/drives" className="text-sm font-semibold">
              See all
            </AppLink>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {dashboards.map((d) => (
              <li key={d.org.id} className="lift relative rounded-xl border border-line-strong bg-surface p-4 shadow-card">
                <p className="text-sm text-muted">Your organization</p>
                <h3 className="font-semibold">
                  <AppLink href={`/organization/${d.org.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                    {d.org.name}
                  </AppLink>
                </h3>
                <p className="mt-1 text-sm">
                  {d.pendingDeliveries.length > 0
                    ? `${countNoun(d.pendingDeliveries.length, "delivery")} to check`
                    : `${countNoun(d.requests.length, "need")} posted`}
                </p>
              </li>
            ))}
            {active.slice(0, 4).map((d) => (
              <DriveCard key={d.commitmentId} drive={d} />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="nearby-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="nearby-title" className="font-serif text-2xl font-semibold tracking-tight">
            Needs near you
          </h2>
          <AppLink href="/requests" className="text-sm font-semibold">
            Find more
          </AppLink>
        </div>
        {nearby.length === 0 ? (
          <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">No needs posted on KitGap near you yet. People nearby may be collecting elsewhere.</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/requests?tab=online" variant="secondary">
                See drives found online
              </ButtonLink>
              {ctx.mode === "live" ? (
                <ButtonLink href="/demo" variant="secondary">
                  See a sample board
                </ButtonLink>
              ) : null}
            </div>
          </Panel>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.slice(0, 3).map((summary) => (
              <li key={summary.request.id}>
                <RequestCard summary={summary} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

function Start({ href, icon, title, text, primary = false }: { href: string; icon: ReactNode; title: string; text: string; primary?: boolean }) {
  return (
    <li>
      <AppLink
        href={href}
        className={
          primary
            ? "flex h-full items-start gap-3 rounded-xl bg-forest p-4 text-white no-underline shadow-card hover:bg-forest-dark sm:p-5"
            : "flex h-full items-start gap-3 rounded-xl border border-line-strong bg-surface p-4 text-ink no-underline shadow-card hover:border-forest sm:p-5"
        }
      >
        <span
          aria-hidden
          className={`grid size-10 shrink-0 place-items-center rounded-lg [&_svg]:size-5 ${primary ? "bg-white/15 text-white" : "bg-forest-tint text-forest"}`}
        >
          {icon}
        </span>
        <span>
          <span className="block text-lg font-semibold">{title}</span>
          <span className={`block text-sm ${primary ? "text-eyebrow" : "text-muted"}`}>{text}</span>
        </span>
      </AppLink>
    </li>
  );
}

function DriveCard({ drive: d }: { drive: MyDriveItem }) {
  return (
    <li className="lift relative rounded-xl border border-line-strong bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm text-muted">For {d.orgName}</p>
        <Pill tone={d.role === "coordinator" ? "forest" : "neutral"}>{d.role === "coordinator" ? "You run it" : "Member"}</Pill>
      </div>
      <h3 className="mt-1 font-semibold">
        <AppLink href={`/drives/${d.commitmentId}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
          {d.requestTitle}
        </AppLink>
      </h3>
      <p className="tabular mt-1 text-sm">
        {formatCount(d.accepted)} of {countNoun(d.quantity, d.unitName)} confirmed
      </p>
      <p className="mt-1 text-sm text-muted">
        {d.role === "coordinator"
          ? `Next: ${d.nextStep.title}`
          : d.myOpenPledges > 0
            ? `You're bringing ${countNoun(d.myOpenPledges, "item")}`
            : "Open it to say what you'll bring"}
      </p>
    </li>
  );
}
