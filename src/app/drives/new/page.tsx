import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClubDriveForm } from "@/components/drives/club-drive-form";
import { AppLink } from "@/components/ui/base";
import { Container, PageHeader } from "@/components/ui/layout-bits";
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
      <PageHeader
        title="Run your own drive"
        description="Collect kits for a place you already know, even if they've never heard of KitGap."
      />
      <ClubDriveForm groups={coordinated} />
    </Container>
  );
}
