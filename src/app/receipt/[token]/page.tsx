import type { Metadata } from "next";
import { ReceiptForm } from "@/components/drives/receipt-form";
import { LogoMark } from "@/components/site/logo";
import { AppLink } from "@/components/ui/base";
import { RecipientStamp } from "@/components/ui/confirmation";
import { Container } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { formatTimestamp } from "@/domain/dates";
import { countNoun, formatCount } from "@/domain/text";
import { getAppContext } from "@/server/next/context";
import { getReceipt } from "@/server/services/club-drives";

export const metadata: Metadata = { title: "Confirm a delivery", robots: { index: false, follow: false } };

// Opened by the recipient of a club's own drive, from the receipt link or QR
// code the club shows at handover. No account needed.
export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getAppContext();
  const receipt = await getReceipt(ctx, token);

  if (!receipt) {
    return (
      <Container narrow className="space-y-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">This receipt link doesn&rsquo;t work</h1>
        <p>It may have been replaced by a newer link. Ask the club that delivered the kits to show you the current one.</p>
      </Container>
    );
  }

  const unit = receipt.unitName;
  return (
    <Container narrow className="space-y-8">
      <header className="rise space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <LogoMark className="size-6" />
          Delivery receipt for {receipt.recipientName}
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          {receipt.groupName} handed over {countNoun(receipt.quantity, unit)}
        </h1>
        <p className="text-lg text-muted">
          {receipt.title}. Reported {formatTimestamp(receipt.submittedAt, receipt.timezone)}.
        </p>
      </header>

      <section aria-labelledby="kit-title" className="tag-shape border border-line-strong bg-surface p-5 shadow-card sm:p-6">
        <h2 id="kit-title" className="font-semibold">
          Each {unit.toLowerCase()} should contain
        </h2>
        <ul className="mt-2 divide-y divide-line">
          {receipt.components.map((c) => (
            <li key={c.name} className="flex items-baseline justify-between gap-4 py-2">
              <span>
                {c.name}
                {c.details ? <span className="block text-sm text-muted">{c.details}</span> : null}
              </span>
              <span className="tabular font-semibold">{formatCount(c.perKit)}</span>
            </li>
          ))}
        </ul>
        {receipt.note ? <p className="mt-3 text-sm">Note from {receipt.groupName}: &ldquo;{receipt.note}&rdquo;</p> : null}
      </section>

      {receipt.status === "reviewed" ? (
        <section className="tag-shape border border-forest/40 bg-forest-tint p-5 sm:p-6" aria-live="polite">
          <p className="kg-stamp inline-block">
            <RecipientStamp className="bg-surface text-base" />
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
            {receipt.notAccepted
              ? `${formatCount(receipt.accepted ?? 0)} accepted, ${formatCount(receipt.notAccepted)} sent back to fix`
              : `All ${formatCount(receipt.accepted ?? 0)} confirmed`}
          </h2>
          <p className="mt-1">
            Confirmed by {receipt.signedName}
            {receipt.reviewedAt ? ` on ${formatTimestamp(receipt.reviewedAt, receipt.timezone)}` : ""}. Thank you. {receipt.groupName} can
            see it now.
          </p>
          {receipt.reviewNote ? <p className="mt-2 text-sm">Your message: &ldquo;{receipt.reviewNote}&rdquo;</p> : null}
        </section>
      ) : receipt.status === "cancelled" ? (
        <Notice tone="info" title="This delivery report was taken back">
          {receipt.groupName} withdrew this report, so there&rsquo;s nothing to confirm here.
        </Notice>
      ) : receipt.viewerIsClubMember ? (
        <Notice tone="warning" title="Give this link to the person receiving the kits">
          You&rsquo;re part of {receipt.groupName}, so you can&rsquo;t confirm your own delivery. Show the QR code to someone at{" "}
          {receipt.recipientName}.
        </Notice>
      ) : (
        <section aria-labelledby="confirm-title" className="space-y-4">
          <h2 id="confirm-title" className="font-serif text-2xl font-semibold tracking-tight">
            Confirm what arrived
          </h2>
          <ReceiptForm token={token} quantity={receipt.quantity} unitName={unit} groupName={receipt.groupName} />
        </section>
      )}

      <p className="text-sm text-muted">
        KitGap helps clubs collect exactly what an organization needs. You don&rsquo;t need an account to confirm. Want your own list,
        so clubs bring only what you need next time? <AppLink href="/organization/new">Post what you need</AppLink>.
      </p>
    </Container>
  );
}
