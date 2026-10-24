import { ArrowRight, Bell, Building2, PackageOpen, Users } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GettingStarted } from "@/components/site/getting-started";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { PhaseBadge, Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import {
  coordinatorGettingStarted,
  homeNextStep,
  orgGettingStarted,
  type HomeDrive,
  type HomeOrg,
  type StartItem,
} from "@/domain/onboarding";
import { countNoun, formatCount } from "@/domain/text";
import { getMyDrives, type MyDriveItem } from "@/server/queries/drives";
import { getMyWorkspaces, getOrgDashboard, getUpdates, type OrgDashboard } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Home" };

function stillOpen(items: StartItem[]) {
  return items.some((item) => !item.done);
}

function startCookie(id: string) {
  return `kg-start-${id}`;
}

// Where people land after signing in: the one thing to do next, then
// everything they're part of. Every section ends in a link somewhere useful.
export default async function HomePage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/home${ctx.sessionExpired ? "&expired=1" : ""}`);
  const [{ drives, groups }, workspaces, updates] = await Promise.all([getMyDrives(ctx), getMyWorkspaces(ctx), getUpdates(ctx)]);
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
  const firstCoordinated = homeDrives.find((d) => d.active && d.role === "coordinator");
  const first = ctx.user.displayName.split(" ")[0];
  const nothingYet = drives.length === 0 && dashboards.length === 0 && groups.length === 0;
  const jar = await cookies();
  const driveStartId = firstCoordinated ? `drive-${firstCoordinated.commitmentId}` : "";
  const orgStartId = homeOrgs[0] ? `org-${homeOrgs[0].id}` : "";
  const driveStart =
    firstCoordinated && stillOpen(coordinatorGettingStarted(firstCoordinated)) && jar.get(startCookie(driveStartId))?.value !== "1";
  const orgStart = homeOrgs[0] && stillOpen(orgGettingStarted(homeOrgs[0])) && jar.get(startCookie(orgStartId))?.value !== "1";

  return (
    <Container className="space-y-10">
      <PageHeader
        title={`Hi, ${first}`}
        description={
          nothingYet
            ? "Start a drive with your group, or post what your organization needs."
            : dashboards.length > 0 && active.length === 0
              ? "Your requests, and any deliveries waiting for a check."
              : dashboards.length === 0
                ? "The next thing on your drives."
                : "The next thing that needs you, then your drives and organizations."
        }
      />

      {!nothingYet ? (
        next.urgency === "now" ? (
          <section aria-labelledby="next-title" className="tag-shape bg-forest p-6 text-white shadow-card sm:p-8">
            <h2 id="next-title" className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              {next.title}
            </h2>
            <p className="mt-2 max-w-2xl text-eyebrow">{next.detail}</p>
            <ButtonLink href={next.href} variant="inverse" className="mt-5">
              {next.label} <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </section>
        ) : (
          <section aria-labelledby="next-title">
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 id="next-title" className="font-serif text-2xl font-semibold tracking-tight">
                  {next.title}
                </h2>
                <p className="mt-1 text-muted">{next.detail}</p>
              </div>
              <ButtonLink href={next.href} variant="secondary">
                {next.label}
              </ButtonLink>
            </Panel>
          </section>
        )
      ) : null}

      {driveStart || orgStart ? (
        <div className={driveStart && orgStart ? "grid gap-4 md:grid-cols-2" : "max-w-xl"}>
          {driveStart && firstCoordinated ? (
            <GettingStarted id={driveStartId} title="Run your first drive" items={coordinatorGettingStarted(firstCoordinated)} />
          ) : null}
          {orgStart && homeOrgs[0] ? (
            <GettingStarted id={orgStartId} title={`Set up ${homeOrgs[0].name}`} items={orgGettingStarted(homeOrgs[0])} />
          ) : null}
        </div>
      ) : null}

      {nothingYet ? (
        <Section title="How do you want to help?" id="start">
          <div className="grid gap-4 md:grid-cols-2">
            <Choice
              icon={<Users />}
              title="Run a drive with your club or group"
              text="Pick a request, choose how many kits you can make, and share one link with your members."
              href="/requests"
              label="Find a request"
            />
            <Choice
              icon={<Building2 />}
              title="Post what your organization needs"
              text="Shelters, pantries and schools post exact lists. A KitGap reviewer checks each one first."
              href="/organization/new"
              label="Register an organization"
            />
          </div>
          <p className="text-sm text-muted">Got an invitation link from a coordinator? Open it to join their group.</p>
        </Section>
      ) : null}

      {active.length > 0 || groups.length > 0 ? (
        <Section
          title="Your drives"
          id="drives"
          actions={
            <AppLink href="/drives" className="text-sm font-semibold">
              All drives and groups
            </AppLink>
          }
        >
          {active.length === 0 ? (
            <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-muted">
                <PackageOpen aria-hidden className="size-5" /> Your groups aren&apos;t running a drive right now.
              </p>
              <ButtonLink href="/requests" size="sm">
                Find a request
              </ButtonLink>
            </Panel>
          ) : (
            <ul className={active.length > 1 ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
              {active.slice(0, 4).map((d) => (
                <DriveCard key={d.commitmentId} drive={d} />
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {dashboards.map((d) => (
        <Section
          key={d.org.id}
          title={d.org.name}
          id={`org-${d.org.id}`}
          description="Requests you've posted."
          actions={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/organization/${d.org.id}`} size="sm">
                Open dashboard
              </ButtonLink>
              <ButtonLink href={`/organization/${d.org.id}/requests/new`} size="sm" variant="secondary">
                New request
              </ButtonLink>
            </div>
          }
        >
          {d.pendingDeliveries.length > 0 ? (
            <Notice tone="info">
              <span className="font-semibold">{countNoun(d.pendingDeliveries.length, "delivery")} waiting for your check.</span>{" "}
              <AppLink href={`/organization/${d.org.id}#pending`} className="font-semibold">
                Review them
              </AppLink>
            </Notice>
          ) : null}
          {d.requests.length === 0 ? (
            <p className="rounded-xl bg-sunken px-5 py-4 text-muted">
              No requests yet.{" "}
              <AppLink href={`/organization/${d.org.id}/requests/new`} className="font-semibold">
                Post your first one from a template
              </AppLink>{" "}
              in about a minute.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line/80 bg-surface shadow-card">
              {d.requests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <AppLink href={`/organization/${d.org.id}/requests/${r.id}`} className="font-semibold">
                      {r.title}
                    </AppLink>
                    {r.totals ? (
                      <p className="tabular text-sm text-muted">
                        {formatCount(r.totals.accepted)} of {countNoun(r.totals.target, r.unitName)} received · {formatCount(r.totals.promised)} promised
                      </p>
                    ) : null}
                  </div>
                  <PhaseBadge phase={r.phase} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}

      <Section
        title="Recent updates"
        id="updates"
        actions={
          <AppLink href="/updates" className="text-sm font-semibold">
            All updates
          </AppLink>
        }
      >
        {updates.items.length === 0 ? (
          <Panel>
            <p className="flex items-center gap-2 text-muted">
              <Bell aria-hidden className="size-5 shrink-0" />
              When someone pledges, delivers or confirms supplies, it shows up here.
            </p>
          </Panel>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line/80 bg-surface shadow-card">
            {updates.items.slice(0, 5).map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p>
                  {item.unread ? <Pill tone="clay">New</Pill> : null}{" "}
                  <span className="font-semibold">{item.actorName}</span> {item.text}
                </p>
                <p className="text-sm text-muted">
                  {item.link ? (
                    <AppLink href={item.link} className="font-semibold">
                      {item.context}
                    </AppLink>
                  ) : (
                    item.context
                  )}
                  {" · "}
                  {formatTimestamp(item.createdAt, "America/New_York")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Container>
  );
}

function DriveCard({ drive: d }: { drive: MyDriveItem }) {
  return (
    <li className="lift relative rounded-xl border border-line/80 bg-surface p-4 shadow-card hover:border-forest/40 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 text-sm text-muted">
          {d.groupName} · for {d.orgName}
        </p>
        <Pill tone={d.role === "coordinator" ? "forest" : "neutral"}>{d.role === "coordinator" ? "Coordinator" : "Member"}</Pill>
      </div>
      <h3 className="mt-1 font-semibold">
        <AppLink href={`/drives/${d.commitmentId}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
          {d.requestTitle}
        </AppLink>
      </h3>
      <p className="tabular mt-1 text-sm">
        {countNoun(d.quantity, d.unitName)} promised · {formatCount(d.accepted)} confirmed
        {d.pendingReview > 0 ? ` · ${formatCount(d.pendingReview)} awaiting review` : ""}
      </p>
      <p className="mt-1 text-sm text-muted">
        Needed by {formatCalendarDate(d.neededBy)}
        {d.deadline.description ? (
          <span className={d.deadline.passed ? "font-semibold text-amber" : undefined}>
            {" "}
            · {d.deadline.passed ? `Overdue: ${d.deadline.description.toLowerCase()}` : d.deadline.description}
          </span>
        ) : null}
      </p>
      <p className="relative mt-2 text-sm">
        {d.role === "coordinator"
          ? `Next: ${d.nextStep.title}`
          : d.myOpenPledges > 0
            ? `You're bringing ${countNoun(d.myOpenPledges, "item")}`
            : "Open it to pledge supplies"}
      </p>
    </li>
  );
}

function Choice({ icon, title, text, href, label }: { icon: React.ReactNode; title: string; text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line/80 bg-surface p-5 shadow-card">
      <span aria-hidden className="grid size-11 place-items-center rounded-lg bg-forest text-white [&_svg]:size-5">
        {icon}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted">{text}</p>
      <div className="mt-auto">
        <ButtonLink href={href}>{label}</ButtonLink>
      </div>
    </div>
  );
}
