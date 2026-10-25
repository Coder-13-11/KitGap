import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StageSummary } from "@/components/drives/stages";
import { ShareDrive } from "@/components/drives/share-drive";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { Pill } from "@/components/ui/status";
import { RecipientStamp } from "@/components/ui/confirmation";
import { recordView, viewCount } from "@/server/queries/reach";
import { formatCalendarDate } from "@/domain/dates";
import { kitsStillToConfirm, shareDriveSentence } from "@/domain/guidance";
import { countNoun, formatCount } from "@/domain/text";
import { getPublicDrive } from "@/server/queries/drives";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

export const metadata: Metadata = { title: "Drive progress" };

// The page behind a drive's share link. Totals only: no contributor names,
// contact details or drop-off instructions.
export default async function PublicDrivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const drive = await getPublicDrive(ctx, id);
  if (!drive) notFound();
  if (!drive.viewerIsMember) await recordView(ctx, "drive", drive.commitmentId);
  const views = await viewCount(ctx, "drive", drive.commitmentId);
  const unit = drive.request.unitName;
  const needs = drive.progress.components.filter((c) => c.uncovered > 0);
  const still = kitsStillToConfirm(drive.quantity, drive.progress.stages.accepted);
  const sentence = shareDriveSentence(still, unit, drive.org.name);
  const publicUrl = `${siteUrl()}${ctx.base}/d/${drive.commitmentId}`;

  return (
    <Container narrow className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-muted">
          A drive by{" "}
          <AppLink href={`/record/group/${drive.group.id}`} className="underline">
            {drive.group.name}
          </AppLink>
          {drive.group.city ? ` · ${drive.group.city}` : ""}
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {countNoun(drive.quantity, unit)} for {drive.org.name}
        </h1>
        <p className="text-lg text-muted">
          {drive.tier === "recipient" ? `“${drive.request.title}”` : `Part of the request “${drive.request.title}”`}, needed by{" "}
          {formatCalendarDate(drive.request.neededBy)}.
        </p>
        {drive.status !== "active" ? <Pill tone="danger">This drive was withdrawn</Pill> : null}
      </header>

      <Panel className="space-y-4">
        <h2 className="text-lg font-semibold">Progress</h2>
        <p className="font-serif text-5xl leading-none font-semibold tracking-tight text-forest tabular">
          {formatCount(drive.progress.stages.accepted)}
          <span className="text-2xl text-muted"> / {formatCount(drive.quantity)}</span>
        </p>
        <p>
          {formatCount(drive.progress.stages.accepted)} of {countNoun(drive.quantity, unit)} confirmed received by {drive.org.name}.
        </p>
        {drive.tier === "recipient" ? (
          <p className="text-sm text-muted">
            <RecipientStamp /> {drive.org.name} isn&rsquo;t on KitGap. It confirms what arrived with a receipt link the club gives it
            at handover.
          </p>
        ) : null}
        <StageSummary stages={drive.progress.stages} committed={drive.quantity} requestType={drive.request.requestType} unitName={unit} />
        <div className="rounded-lg bg-forest-tint px-4 py-4">
          <p className="text-lg font-semibold">{sentence}</p>
          <div className="mt-3">
            <ShareDrive url={publicUrl} sentence={sentence} qrName="kitgap-drive-progress" />
          </div>
          {views !== null ? (
            <p className="mt-3 text-sm text-muted">
              <span className="tabular font-semibold text-ink">{views.toLocaleString("en-US")}</span> {views === 1 ? "view" : "views"} of this page so
              far.
            </p>
          ) : null}
        </div>
      </Panel>

      {drive.status === "active" ? (
        <Section title="Still needed" id="needs" description={drive.bottleneck.headline}>
          {needs.length === 0 ? (
            <p className="text-muted">Everything still needed has been pledged or collected.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {needs.map((c) => (
                <li key={c.componentId} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    {c.details ? <span className="block text-sm text-muted">{c.details}</span> : null}
                  </span>
                  <span className="tabular font-semibold">{formatCount(c.uncovered)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <Panel className="space-y-3">
        <h2 className="text-lg font-semibold">Want to help?</h2>
        {drive.viewerIsMember ? (
          <ButtonLink href={`/drives/${drive.commitmentId}`}>Open the drive to pledge</ButtonLink>
        ) : (
          <p>
            Ask the coordinator of {drive.group.name} for their invitation link. Once you join, you can pledge items from the list
            above.
          </p>
        )}
        <p className="text-sm">
          <AppLink href={`/requests/${drive.request.id}`} className="font-semibold">
            See the full request from {drive.org.name}
          </AppLink>
        </p>
      </Panel>
    </Container>
  );
}
