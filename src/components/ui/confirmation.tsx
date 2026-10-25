import type { ConfirmationTier } from "@/domain/types";
import { cn } from "./cn";

// Two tiers of "it arrived". The solid forest stamp means a KitGap-verified
// organization confirmed. The outlined stamp means a recipient that isn't on
// KitGap confirmed through a receipt link the club shared; it is honest about
// what that link can and can't prove, so it never looks like the verified one.

export function VerifiedStamp({ className }: { className?: string }) {
  return <span className={cn("stamp text-sm", className)}>Confirmed</span>;
}

export function RecipientStamp({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border-2 border-dashed border-forest px-1.5 py-px align-[1px] text-sm font-semibold text-forest",
        className,
      )}
    >
      Confirmed by recipient
    </span>
  );
}

export function TierStamp({ tier, className }: { tier: ConfirmationTier; className?: string }) {
  return tier === "verified" ? <VerifiedStamp className={className} /> : <RecipientStamp className={className} />;
}

/** One sentence on what the tier means, for the drive and share pages. */
export function tierExplanation(tier: ConfirmationTier, recipientName: string): string {
  return tier === "verified"
    ? `${recipientName} is on KitGap, and a reviewer confirmed its contact. Only what it confirms counts.`
    : `${recipientName} isn't on KitGap. It confirms through a receipt link you give it at handover, so its confirmations are labelled "Confirmed by recipient".`;
}
