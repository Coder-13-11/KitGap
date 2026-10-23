import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/drives/print-button";
import { AppLink } from "@/components/ui/base";
import { Container } from "@/components/ui/layout-bits";
import { formatCalendarDate } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { getDriveWorkspace } from "@/server/queries/drives";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Packing sheet" };

// A printable sheet for the people packing kits: the recipe, the totals, and
// a checklist row per kit still to pack. No contributor names.
export default async function PackingSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/drives/${id}/packing-sheet`)}`);
  const drive = await getDriveWorkspace(ctx, id);
  if (!drive || drive === "not_allowed" || drive.role === "organization") notFound();
  const { request, progress, commitment } = drive;
  const isKit = request.requestType === "kit";
  const rows = Math.min(progress.stages.toBuild, 60);
  return (
    <Container narrow className="space-y-6 print:max-w-none print:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <AppLink href={`/drives/${id}`}>← Back to the drive</AppLink>
        <PrintButton />
      </div>
      <header className="space-y-1">
        <p className="text-sm text-muted">
          {drive.group.name} · for {drive.org.name}
        </p>
        <h1 className="font-serif text-2xl font-semibold">{isKit ? "Packing sheet" : "Collection checklist"}: {request.title}</h1>
        <p>
          {countNoun(commitment.quantity, request.unitName)} committed · {formatCount(progress.stages.accepted)} confirmed received ·
          needed by {request.neededBy ? formatCalendarDate(request.neededBy) : "not set"}
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{isKit ? `Each ${request.unitName.toLowerCase()} contains` : "Item"}</h2>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-1.5 pr-2">Item</th>
              <th scope="col" className="py-1.5 pr-2">Details</th>
              {isKit ? <th scope="col" className="py-1.5 pr-2 text-right">Per kit</th> : null}
              <th scope="col" className="py-1.5 pr-2 text-right">Collected</th>
              <th scope="col" className="py-1.5 text-right">Still needed</th>
            </tr>
          </thead>
          <tbody>
            {progress.components.map((c) => (
              <tr key={c.componentId} className="border-b border-line">
                <td className="py-1.5 pr-2 font-semibold">{c.name}</td>
                <td className="py-1.5 pr-2">{c.details}</td>
                {isKit ? <td className="tabular py-1.5 pr-2 text-right">{c.quantityPerUnit}</td> : null}
                <td className="tabular py-1.5 pr-2 text-right">{formatCount(c.collected)}</td>
                <td className="tabular py-1.5 text-right">{formatCount(c.stillNeeded)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {request.conditionNotes ? <p className="text-sm">Condition: {request.conditionNotes}</p> : null}
        {request.substitutions ? <p className="text-sm">Substitutions: {request.substitutions}</p> : null}
      </section>
      {isKit && rows > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Kits still to pack ({formatCount(progress.stages.toBuild)})</h2>
          <p className="text-sm text-muted">Tick each item as it goes in. Record packed kits in KitGap afterwards.</p>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="py-1 pr-2">Kit</th>
                {progress.components.map((c) => (
                  <th key={c.componentId} scope="col" className="py-1 pr-2">
                    {c.name} ×{c.quantityPerUnit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="tabular py-1.5 pr-2">{progress.stages.built + i + 1}</td>
                  {progress.components.map((c) => (
                    <td key={c.componentId} className="py-1.5 pr-2">
                      <span aria-hidden className="inline-block size-4 border border-ink" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {progress.stages.toBuild > rows ? <p className="text-sm">Showing the first {rows} rows.</p> : null}
        </section>
      ) : null}
      <p className="text-xs text-muted">Printed from KitGap. Contains no contributor names or contact details.</p>
    </Container>
  );
}
