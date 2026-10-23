import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import { DisplayNameForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { Container, PageHeader, Panel, Section } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { getMyWorkspaces } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  if (ctx.mode === "demo") redirect("/demo");
  if (!ctx.user) redirect(`/sign-in?next=/account${ctx.sessionExpired ? "&expired=1" : ""}`);
  const workspaces = await getMyWorkspaces(ctx);
  return (
    <Container narrow className="space-y-8">
      {params.updated === "password" ? (
        <Notice tone="success" live="polite">
          Your password was changed.
        </Notice>
      ) : null}
      <PageHeader title="Account" />
      <Section title="Your name" id="name">
        <Panel>
          <DisplayNameForm displayName={ctx.user.displayName} />
        </Panel>
      </Section>
      <Section title="Sign-in details" id="signin">
        <Panel className="space-y-3">
          <p>
            <span className="text-muted">Email: </span>
            <span className="font-semibold">{ctx.user.email}</span>
          </p>
          <p className="text-sm text-muted">Your email address is private. It's never shown to groups, organizations or the public.</p>
          <p className="flex flex-wrap gap-3">
            <AppLink href="/reset-password" className="font-semibold">
              Change password
            </AppLink>
          </p>
          <form action={signOutAction}>
            <button type="submit" className={buttonClass("secondary")}>
              Sign out
            </button>
          </form>
        </Panel>
      </Section>
      <Section title="Your workspaces" id="workspaces">
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {workspaces.organizations.map((o) => (
            <li key={o.id} className="flex justify-between gap-2 px-4 py-3">
              <AppLink href={`/organization/${o.id}`} className="font-semibold">
                {o.name}
              </AppLink>
              <span className="text-sm text-muted">Organization · {o.role === "admin" ? "Manager" : "Staff"}</span>
            </li>
          ))}
          {workspaces.groups.map((g) => (
            <li key={g.id} className="flex justify-between gap-2 px-4 py-3">
              <AppLink href={`/groups/${g.id}`} className="font-semibold">
                {g.name}
              </AppLink>
              <span className="text-sm text-muted">Group · {g.role === "admin" ? "Coordinator" : "Member"}</span>
            </li>
          ))}
          {workspaces.organizations.length + workspaces.groups.length === 0 ? <li className="px-4 py-3 text-muted">None yet.</li> : null}
        </ul>
        <p className="flex flex-wrap gap-4 text-sm">
          <AppLink href="/organization/new" className="font-semibold">Register an organization</AppLink>
          <AppLink href="/groups/new" className="font-semibold">Create a group</AppLink>
        </p>
      </Section>
    </Container>
  );
}
