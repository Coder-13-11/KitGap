import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceForm } from "@/components/workspaces/workspace-forms";
import { Container, PageHeader, Panel } from "@/components/ui/layout-bits";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Register an organization" };

export default async function NewOrganizationPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/organization/new&reason=organization${ctx.sessionExpired ? "&expired=1" : ""}`);
  return (
    <Container narrow className="space-y-6">
      <PageHeader
        title="Register an organization"
        description="For schools, shelters, pantries and other organizations that receive goods for the people they serve. It takes a minute; you can post your first request right after."
      />
      <Panel>
        <WorkspaceForm kind="organization" />
      </Panel>
      <p className="text-sm text-muted">
        You'll be the organization's manager and can invite colleagues later. Your public display name and your private account details
        are kept separate.
      </p>
    </Container>
  );
}
