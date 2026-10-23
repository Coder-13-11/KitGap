import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinButton } from "@/components/workspaces/workspace-forms";
import { AppLink } from "@/components/ui/base";
import { Container, Panel } from "@/components/ui/layout-bits";
import { getInvitation } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/join/${token}`)}&reason=join`);
  const invitation = await getInvitation(ctx, token);
  if (!invitation) {
    return (
      <Container narrow className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold">This invitation link doesn't work</h1>
        <p>It may have been replaced with a new one. Ask the person who sent it for the current link.</p>
      </Container>
    );
  }
  const where = invitation.kind === "group" ? `/groups/${invitation.workspaceId}` : `/organization/${invitation.workspaceId}`;
  return (
    <Container narrow className="space-y-6">
      <Panel className="space-y-4">
        <p className="text-sm font-semibold text-muted">{invitation.kind === "group" ? "Group invitation" : "Organization invitation"}</p>
        <h1 className="font-serif text-3xl font-semibold">Join {invitation.name}</h1>
        <p className="text-muted">{invitation.city}</p>
        {invitation.alreadyMember ? (
          <p>
            You're already a member.{" "}
            <AppLink href={where} className="font-semibold">
              Go to {invitation.name}
            </AppLink>
          </p>
        ) : (
          <>
            <p>
              {invitation.kind === "group"
                ? "As a member you can see the group's drives and pledge supplies. Coordinators will see your name next to your pledges; the public never does."
                : "As staff you can see your organization's requests and confirm deliveries."}
            </p>
            <p className="text-sm text-muted">You'll join as {ctx.user!.displayName}.</p>
            <JoinButton token={token} label={`Join ${invitation.name}`} />
          </>
        )}
      </Panel>
    </Container>
  );
}
