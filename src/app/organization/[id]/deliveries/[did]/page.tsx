import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReviewDeliveryForm } from "@/components/drives/review-form";
import { SupplyTable } from "@/components/requests/supply-table";
import { AppLink } from "@/components/ui/base";
import { Container, Panel } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { getDeliveryForReview } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Review a delivery" };

export default async function ReviewDeliveryPage({ params }: { params: Promise<{ id: string; did: string }> }) {
  const { id, did } = await params;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/organization/${id}/deliveries/${did}`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getDeliveryForReview(ctx, did);
  if (!data || (data !== "not_allowed" && data.orgId !== id)) notFound();
  if (data === "not_allowed") {
    return (
      <Container narrow className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold">Only the receiving organization can review this</h1>
        <p>Deliveries are confirmed by the organization that receives them.</p>
      </Container>
    );
  }
  const { delivery, request, drive } = data;
  const unit = request.unitName;
  const timezone = request.timezone;

  return (
    <Container narrow className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}`}>← {data.orgName}</AppLink>
      </nav>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-muted">Delivery from {data.groupName}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {countNoun(delivery.quantity, unit)} for “{request.title}”
        </h1>
        <p className="text-muted">
          Reported by {data.submittedByName} on {formatTimestamp(delivery.submittedAt, timezone)}. This group has committed to{" "}
          {countNoun(drive.quantity, unit)}; {formatCount(drive.accepted)} accepted so far.
        </p>
        {delivery.note ? <p className="rounded-md bg-sunken px-3 py-2">Their note: “{delivery.note}”</p> : null}
      </header>

      <Panel className="space-y-2">
        <h2 className="font-semibold">{request.requestType === "kit" ? `Each ${unit.toLowerCase()} should contain` : "Each item should be"}</h2>
        <SupplyTable
          caption="Contents to check"
          units={delivery.quantity}
          unitName={unit}
          showPerUnit={request.requestType === "kit"}
          rows={data.supply.map((s) => ({ key: s.componentId, name: s.name, details: s.details, perUnit: s.quantityPerUnit, total: s.quantityPerUnit * delivery.quantity }))}
        />
        {request.conditionNotes ? <p className="text-sm text-muted">Accepted condition: {request.conditionNotes}</p> : null}
        {request.substitutions ? <p className="text-sm text-muted">Accepted substitutions: {request.substitutions}</p> : null}
      </Panel>

      {delivery.status === "reviewed" ? (
        <Notice tone={delivery.notAcceptedQuantity ? "warning" : "success"} title="Already reviewed">
          {data.reviewedByName ?? "Someone"} accepted {formatCount(delivery.acceptedQuantity ?? 0)} of {countNoun(delivery.quantity, unit)}
          {delivery.reviewedAt ? ` on ${formatTimestamp(delivery.reviewedAt, timezone)}` : ""}.
          {delivery.reviewNote ? ` “${delivery.reviewNote}”` : ""}
        </Notice>
      ) : delivery.status === "cancelled" ? (
        <Notice tone="info" title="The group took this report back">
          They may report a corrected delivery.
        </Notice>
      ) : data.submittedByViewer ? (
        <Notice tone="warning" title="You reported this delivery">
          Someone else at {data.orgName} needs to confirm it, so the same person doesn't both hand over and accept.
        </Notice>
      ) : (
        <Panel>
          <ReviewDeliveryForm deliveryId={delivery.id} orgId={id} quantity={delivery.quantity} unitName={unit} groupName={data.groupName} />
        </Panel>
      )}
    </Container>
  );
}
