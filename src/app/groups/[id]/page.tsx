import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberList } from "@/components/workspaces/members";
import { RotateInviteButton, WorkspaceForm } from "@/components/workspaces/workspace-forms";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { ShareDrive } from "@/components/drives/share-drive";
import { Container, PageHeader, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { countNoun } from "@/domain/text";
import { getMyDrives } from "@/server/queries/drives";
import { getGroup } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const flags = await searchParams;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/groups/${id}`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const group = await getGroup(ctx, id);
  if (!group) notFound();
  if (group === "not_allowed") {
    return (
      <Container narrow className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold">You're not a member of this group</h1>
        <p>Ask its coordinator for the invitation link.</p>
      </Container>
    );
  }
  const { drives } = await getMyDrives(ctx);
  const groupDrives = drives.filter((d) => d.groupId === id);
  const isAdmin = group.role === "admin";
  return (
    <Container narrow className="space-y-8">
      {flags.created ? (
        <Notice tone="success" live="polite" title="Group created">
          Next, find a request your group can take on, and invite members with the link below.
        </Notice>
      ) : null}
      {flags.joined ? (
        <Notice tone="success" live="polite" title={`You joined ${group.name}`}>
          Open one of the group's drives below to pledge supplies.
        </Notice>
      ) : null}
      <PageHeader eyebrow={group.city} title={group.name} actions={isAdmin ? <ButtonLink href="/requests">Find a request</ButtonLink> : undefined} />
      <p>
        <AppLink href={`/record/group/${group.id}`} className="font-semibold underline">
          Confirmed record
        </AppLink>
      </p>

      <Section title="Drives" id="drives">
        {groupDrives.length === 0 ? (
          <p className="text-muted">This group isn't running any drives yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {groupDrives.map((d) => (
              <li key={d.commitmentId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <AppLink href={`/drives/${d.commitmentId}`} className="font-semibold">
                  {d.requestTitle}
                </AppLink>
                <span className="text-sm text-muted">
                  {countNoun(d.quantity, d.unitName)} for {d.orgName}
                  {d.status !== "active" ? " · withdrawn" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Members" id="members">
        <MemberList workspaceId={id} members={group.members} viewerId={ctx.userId} canManage={isAdmin} adminLabel="Coordinator" memberLabel="Member" />
        {isAdmin && group.inviteToken ? (
          <Panel className="space-y-2">
            <h3 className="font-semibold">Invite members</h3>
            <p className="text-sm text-muted">People who open this link and sign in join {group.name} and can pledge supplies. Share it only with your group.</p>
            <ShareDrive
              url={`${siteUrl()}${ctx.base}/join/${group.inviteToken}`}
              subject={`Join ${group.name} on KitGap`}
              sentence={`Join ${group.name} on KitGap. Open the link, sign in, and you can pledge supplies for our drives.`}
              copyLabel="Copy invitation link"
              qrName="kitgap-invite"
            />
            <RotateInviteButton workspaceId={id} />
          </Panel>
        ) : null}
      </Section>

      {isAdmin ? (
        <Section title="Details" id="details">
          <Panel>
            <WorkspaceForm kind="group" workspaceId={id} values={{ name: group.name, city: group.city, about: group.about, contactName: "", contactEmail: "", contactPhone: "" }} />
          </Panel>
        </Section>
      ) : null}
    </Container>
  );
}
