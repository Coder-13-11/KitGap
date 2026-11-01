import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/server/next/context";
import { getRequestDetail } from "@/server/queries/requests";
import { Container, PageHeader } from "@/components/ui/layout-bits";
import { AppLink } from "@/components/ui/base";
import { IndividualPledgeForm } from "@/components/requests/individual-pledge-form";
import { formatCalendarDate } from "@/domain/dates";
export const metadata={title:"I’ll bring…"};
export default async function HelpPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{quantity?:string}>}) {
  const {id}=await params; const {quantity}=await searchParams;
  const n=quantity && /^\d{1,6}$/.test(quantity)?Number(quantity):1;
  const ctx=await getAppContext();
  if(!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/requests/${id}/help?quantity=${n}`)}&reason=adopt`);
  const detail=await getRequestDetail(ctx,id); if(!detail) notFound();
  return <Container narrow className="space-y-6">
    <AppLink href={`/requests/${id}`} className="inline-flex min-h-12 items-center">← Back to the need</AppLink>
    <PageHeader title="I’ll bring…" description={`${detail.request.title} · ${detail.org.name}`} />
    <p className="text-muted">Needed by {formatCalendarDate(detail.request.neededBy)} · {detail.request.location}</p>
    {detail.viewer.canAdopt ? <IndividualPledgeForm requestId={id} available={detail.totals.available} initialQuantity={n} unitName={detail.request.unitName} components={detail.components} /> :
      <div className="rounded-xl bg-surface p-5"><p className="font-semibold">This need is no longer taking new pledges.</p><AppLink href="/requests">Find another way to help</AppLink></div>}
  </Container>;
}

