import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberList } from "@/components/workspaces/members";
import { RotateInviteButton, WorkspaceForm } from "@/components/workspaces/workspace-forms";
import { AppLink } from "@/components/ui/base";
import { CopyLink } from "@/components/ui/copy-link";
import { Container, PageHeader, Panel, Section } from "@/components/ui/layout-bits";
import { getOrgDashboard } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrgSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/organization/${id}/settings`)}`);
  const data = await getOrgDashboard(ctx, id);
  if (!data) notFound();
  if (data === "not_allowed") redirect(`${ctx.base}/organization/${id}`);
  const { org } = data;
  const isAdmin = data.role === "admin";
  return (
    <Container narrow className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}`}>← {org.name}</AppLink>
      </nav>
      <PageHeader title="Organization settings" description={org.name} />
      <Section title="Members" id="members">
        <MemberList workspaceId={id} members={data.members} viewerId={ctx.userId} canManage={isAdmin} adminLabel="Manager" memberLabel="Staff member" />
        {isAdmin && org.inviteToken ? (
          <Panel className="space-y-2">
            <h3 className="font-semibold">Invite colleagues</h3>
            <p className="text-sm text-muted">Anyone who opens this link and signs in joins {org.name} as staff and can review deliveries.</p>
            <CopyLink url={`${siteUrl()}${ctx.base}/join/${org.inviteToken}`} label="Copy invitation link" />
            <RotateInviteButton workspaceId={id} />
          </Panel>
        ) : null}
      </Section>
      {isAdmin ? (
        <Section title="Details" id="details">
          <Panel>
            <WorkspaceForm
              kind="organization"
              workspaceId={id}
              values={{ name: org.name, city: org.city, about: org.about, contactName: org.contactName, contactEmail: org.contactEmail, contactPhone: org.contactPhone }}
            />
          </Panel>
        </Section>
      ) : null}
    </Container>
  );
}
