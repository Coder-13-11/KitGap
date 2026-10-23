import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdoptForm } from "@/components/drives/adopt-form";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { PHASE_EXPLANATION, PHASE_LABEL } from "@/domain/phase";
import { getRequestDetail } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Start a drive" };

export default async function AdoptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const { quantity } = await searchParams;
  const ctx = await getAppContext();
  const wanted = quantity && /^\d{1,6}$/.test(quantity) ? Number(quantity) : null;

  if (!ctx.user) {
    const next = `/requests/${id}/adopt${wanted ? `?quantity=${wanted}` : ""}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}&reason=adopt${ctx.sessionExpired ? "&expired=1" : ""}`);
  }

  // Availability is read fresh here, after sign-in, not carried over.
  const detail = await getRequestDetail(ctx, id);
  if (!detail) notFound();
  const { request, totals, phase, viewer, org } = detail;

  return (
    <Container narrow className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/requests/${id}`}>← Back to the request</AppLink>
      </nav>
      <PageHeader eyebrow={`Request from ${org.name}`} title="Start a drive" description={request.title} />
      {!viewer.canAdopt ? (
        <Notice tone="warning" title={`This request is ${PHASE_LABEL[phase].toLowerCase()}`}>
          <p>{PHASE_EXPLANATION[phase]}</p>
          <p className="mt-2">
            <ButtonLink href="/requests" variant="secondary" size="sm">
              Find another request
            </ButtonLink>
          </p>
        </Notice>
      ) : (
        <>
          {wanted && wanted > totals.available ? (
            <Notice tone="warning" title="Fewer are available than you chose">
              You chose {wanted}, but only {totals.available} {totals.available === 1 ? "is" : "are"} still open. Another group may have
              started a drive in the meantime. The quantity below has been lowered to what's available.
            </Notice>
          ) : null}
          <AdoptForm
            requestId={request.id}
            orgName={org.name}
            available={totals.available}
            unitName={request.unitName}
            requestType={request.requestType}
            components={detail.components.map((c) => ({ id: c.id, name: c.name, quantityPerUnit: c.quantityPerUnit, details: c.details }))}
            groups={viewer.adminGroups}
            initialQuantity={wanted}
          />
        </>
      )}
    </Container>
  );
}
