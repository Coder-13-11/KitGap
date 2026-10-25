"use client";

// At handover, the coordinator makes a receipt link for the recipient and
// shows its QR code (or sends the link). The link is shown only once, right
// after it's made; making a new one switches the old one off.

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { issueReceiptAction } from "@/actions/club-drives";
import { SubmitButton } from "../ui/button";
import { CopyLink } from "../ui/copy-link";
import { ErrorSummary } from "../ui/error-summary";
import { PendingContext, useActionSubmit } from "../ui/use-action-submit";

export function ReceiptLink({
  deliveryId,
  recipientName,
  alreadyIssued,
}: {
  deliveryId: string;
  recipientName: string;
  alreadyIssued: boolean;
}) {
  const { state, pending, onSubmit } = useActionSubmit(issueReceiptAction);
  const failed = state && !state.ok ? state : null;
  const path = state?.ok ? state.data.path : null;
  const url = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : null;
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c2921", light: "#fbf6ec" } })
      .then((svg) => {
        if (live) setQr({ url, svg });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url]);

  return (
    <div className="mt-2 space-y-3 rounded-md border border-line bg-paper p-3">
      {url ? (
        <div className="kg-slide grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
          {qr?.url === url ? (
            <div
              className="tag-shape size-36 overflow-hidden border border-line-strong bg-surface p-1 [&_svg]:size-full"
              role="img"
              aria-label={`QR code for ${recipientName}'s receipt link`}
              dangerouslySetInnerHTML={{ __html: qr.svg }}
            />
          ) : (
            <div className="tag-shape skeleton size-36" />
          )}
          <div className="space-y-2">
            <p className="font-semibold">Show this to {recipientName} at handover</p>
            <p className="text-sm text-muted">
              They scan it, check what arrived and confirm. No account needed. This link is shown only now; copy it if you&rsquo;ll send
              it instead.
            </p>
            <CopyLink url={url} label="Copy receipt link" />
          </div>
        </div>
      ) : (
        <PendingContext value={pending}>
          <form onSubmit={onSubmit} className="space-y-2">
            <input type="hidden" name="deliveryId" value={deliveryId} />
            {failed ? <ErrorSummary message={failed.message} fieldErrors={{}} token={state} /> : null}
            <p className="text-sm">
              {recipientName} isn&rsquo;t on KitGap, so they confirm with a receipt link.
              {alreadyIssued ? " You made one already; a new link switches the old one off." : ""}
            </p>
            <SubmitButton pendingLabel="Making the link…" className="min-h-10">
              {alreadyIssued ? "Make a new receipt link" : "Make the receipt link"}
            </SubmitButton>
          </form>
        </PendingContext>
      )}
    </div>
  );
}
