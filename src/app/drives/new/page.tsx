import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClubDriveForm } from "@/components/drives/club-drive-form";
import { AppLink } from "@/components/ui/base";
import { Container } from "@/components/ui/layout-bits";
import { getAppContext } from "@/server/next/context";
import { getMyWorkspaces } from "@/server/queries/organization";

export const metadata: Metadata = { title: "Run your own drive" };

export default async function NewClubDrivePage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/drives/new${ctx.sessionExpired ? "&expired=1" : ""}`);
  const { groups } = await getMyWorkspaces(ctx);
  const coordinated = groups.filter((g) => g.role === "admin").map((g) => ({ id: g.id, name: g.name }));

  return (
    <Container narrow className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href="/drives">← My drives</AppLink>
      </nav>
      <header className="rise space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Run your own drive</h1>
        <p className="max-w-2xl text-lg text-muted">
          For a shelter, school or pantry you already know, even if they&rsquo;ve never heard of KitGap. You get the supply checklist,
          member pledges, sign-up import and packing. At handover, they confirm what arrived with a receipt link: no account needed.
        </p>
      </header>
      <ClubDriveForm groups={coordinated} />
    </Container>
  );
}
