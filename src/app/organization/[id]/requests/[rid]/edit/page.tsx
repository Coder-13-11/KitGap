import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RequestForm } from "@/components/requests/request-form";
import { AppLink } from "@/components/ui/base";
import { Container, PageHeader } from "@/components/ui/layout-bits";
import { getOrgRequest } from "@/server/queries/organization";
import { requestToInput } from "@/server/services/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Edit request" };

export default async function EditRequestPage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const ctx = await getAppContext();
  const back = `/organization/${id}/requests/${rid}/edit`;
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(back)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getOrgRequest(ctx, id, rid);
  if (!data) notFound();
  if (data === "not_allowed") redirect(`${ctx.base}/organization/${id}`);
  // Only drafts are fully editable; published requests have their own page.
  if (data.request.status !== "draft") redirect(`${ctx.base}/organization/${id}/requests/${rid}`);
  return (
    <Container narrow className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}/requests/${rid}`}>← Back to the request</AppLink>
      </nav>
      <PageHeader eyebrow={data.orgName} title="Edit draft" description={data.request.title} />
      <RequestForm
        orgId={id}
        orgName={data.orgName}
        requestId={rid}
        initial={requestToInput(data.request, data.components)}
        reviewNote={data.request.statusNote || null}
        signInHref={`/sign-in?next=${encodeURIComponent(back)}`}
      />
    </Container>
  );
}
