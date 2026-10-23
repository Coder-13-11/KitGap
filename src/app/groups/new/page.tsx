import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceForm } from "@/components/workspaces/workspace-forms";
import { Container, PageHeader, Panel } from "@/components/ui/layout-bits";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Create a group" };

export default async function NewGroupPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/groups/new${ctx.sessionExpired ? "&expired=1" : ""}`);
  return (
    <Container narrow className="space-y-6">
      <PageHeader
        title="Create a group"
        description="A school club, team, congregation or neighborhood group that runs drives. You can also create one while starting a drive."
      />
      <Panel>
        <WorkspaceForm kind="group" />
      </Panel>
    </Container>
  );
}
