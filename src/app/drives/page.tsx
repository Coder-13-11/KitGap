import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackageOpen, Users } from "lucide-react";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader, Section } from "@/components/ui/layout-bits";
import { Pill } from "@/components/ui/status";
import { formatCalendarDate } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { ElsewhereList } from "@/components/discover/elsewhere-list";
import { getMyDrives } from "@/server/queries/drives";
import { listExternalSignups } from "@/server/services/external";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "My drives" };

export default async function MyDrivesPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/drives${ctx.sessionExpired ? "&expired=1" : ""}`);
  const [{ drives, groups }, elsewhere] = await Promise.all([getMyDrives(ctx), listExternalSignups(ctx)]);
  const active = drives.filter((d) => d.status === "active");
  const past = drives.filter((d) => d.status !== "active");

  return (
    <Container className="space-y-8">
      <PageHeader
        title="My drives"
        description="Drives for every group you belong to, with the next thing each one needs."
        actions={
          <>
            <ButtonLink href="/drives/new">Run your own drive</ButtonLink>
            <ButtonLink href="/requests" variant="secondary">
              Find a request to adopt
            </ButtonLink>
          </>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          title="You're not in a group yet"
          icon={<Users />}
          action={
            <>
              <ButtonLink href="/drives/new">Run your own drive</ButtonLink>
              <ButtonLink href="/requests" variant="secondary">
                Find a request to adopt
              </ButtonLink>
            </>
          }
        >
          Run a drive for any shelter, school or pantry you already know, or take a share of a request posted on KitGap. Either way
          KitGap sets up your group in the same step. Got an invite link from a coordinator? Open it to join their group.
        </EmptyState>
      ) : null}

      {groups.length > 0 && active.length === 0 ? (
        <EmptyState title="No active drives" icon={<PackageOpen />} action={<ButtonLink href="/drives/new">Run your own drive</ButtonLink>}>
          Your groups aren't running a drive right now. Coordinators can run their own for a recipient they know, or take a share of an
          open request.
        </EmptyState>
      ) : null}

      {active.length > 0 ? (
        <Section title="Active drives" id="active">
          <ul className="space-y-3">
            {active.map((d) => (
              <li key={d.commitmentId} className="lift relative rounded-xl border border-line/80 bg-surface p-5 shadow-card hover:border-forest/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-muted">
                      {d.groupName} · for {d.orgName}
                    </p>
                    <h3 className="text-lg font-semibold">
                      <AppLink href={`/drives/${d.commitmentId}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                        {d.requestTitle}
                      </AppLink>
                    </h3>
                    <p className="tabular text-[0.95rem]">
                      {countNoun(d.quantity, d.unitName)} promised · {formatCount(d.accepted)} confirmed received
                      {d.pendingReview > 0 ? ` · ${formatCount(d.pendingReview)} awaiting review` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      Needed by {formatCalendarDate(d.neededBy)}
                      {d.deadline.description ? (
                        <span className={d.deadline.passed ? "font-semibold text-amber" : undefined}>
                          {" "}
                          · {d.deadline.passed ? `Overdue: ${d.deadline.description.toLowerCase()}` : d.deadline.description}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="space-y-1 md:max-w-xs md:text-right">
                    <Pill tone={d.role === "coordinator" ? "forest" : "neutral"}>{d.role === "coordinator" ? "Coordinator" : "Member"}</Pill>
                    {d.role === "coordinator" ? (
                      <p className="text-sm">
                        <span className="font-semibold">Next: </span>
                        {d.nextStep.title}
                      </p>
                    ) : d.myOpenPledges > 0 ? (
                      <p className="text-sm">You've pledged {countNoun(d.myOpenPledges, "item")} still to bring.</p>
                    ) : (
                      <p className="text-sm text-muted">Open the drive to pledge supplies.</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {past.length > 0 ? (
        <Section title="Withdrawn drives" id="past">
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {past.map((d) => (
              <li key={d.commitmentId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <AppLink href={`/drives/${d.commitmentId}`} className="font-semibold">
                  {d.requestTitle}
                </AppLink>
                <span className="text-sm text-muted">
                  {d.groupName} · {formatCount(d.accepted)} confirmed received
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {elsewhere.length > 0 ? (
        <Section
          title="Drives you joined elsewhere"
          id="elsewhere"
          description="Drives on other sites that you said you signed up for."
          actions={
            <ButtonLink href="/requests?tab=online" variant="secondary">
              Find more drives
            </ButtonLink>
          }
        >
          <ElsewhereList items={elsewhere} />
        </Section>
      ) : null}

      {groups.length > 0 ? (
        <Section title="Your groups" id="groups">
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.id}>
                <AppLink href={`/groups/${g.id}`} className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-4 font-semibold no-underline hover:border-line-strong">
                  {g.name}
                  <span className="ml-2 text-sm font-normal text-muted">{g.role === "admin" ? "Coordinator" : "Member"}</span>
                </AppLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </Container>
  );
}
