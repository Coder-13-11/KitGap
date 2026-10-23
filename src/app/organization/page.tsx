import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { getMyWorkspaces } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "My organizations" };

export default async function OrganizationsPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/organization${ctx.sessionExpired ? "&expired=1" : ""}`);
  const { organizations } = await getMyWorkspaces(ctx);
  if (organizations.length === 1) redirect(`${ctx.base}/organization/${organizations[0].id}`);
  return (
    <Container narrow className="space-y-6">
      <PageHeader title="My organizations" />
      {organizations.length === 0 ? (
        <EmptyState title="You're not part of an organization" action={<ButtonLink href="/organization/new">Register an organization</ButtonLink>}>
          Register your school, shelter, food pantry or other organization to post requests. If your organization is already on
          KitGap, ask a manager for the invitation link.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {organizations.map((o) => (
            <li key={o.id} className="px-4 py-3">
              <AppLink href={`/organization/${o.id}`} className="font-semibold">
                {o.name}
              </AppLink>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
