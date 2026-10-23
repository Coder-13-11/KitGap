import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RequestForm } from "@/components/requests/request-form";
import { AppLink } from "@/components/ui/base";
import { Container, PageHeader } from "@/components/ui/layout-bits";
import { EMPTY_REQUEST_INPUT } from "@/domain/request-input";
import { getOrgDashboard } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const back = `/organization/${id}/requests/new`;
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(back)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getOrgDashboard(ctx, id);
  if (!data) notFound();
  if (data === "not_allowed") redirect(`${ctx.base}/organization/${id}`);
  return (
    <Container narrow className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}`}>← {data.org.name}</AppLink>
      </nav>
      <PageHeader title="New request" description="Describe exactly what you need. Your answers are saved as a draft at each step." />
      <RequestForm
        orgId={id}
        orgName={data.org.name}
        requestId={null}
        initial={{ ...EMPTY_REQUEST_INPUT, location: data.org.city }}
        reviewNote={null}
        signInHref={`/sign-in?next=${encodeURIComponent(back)}`}
      />
    </Container>
  );
}
