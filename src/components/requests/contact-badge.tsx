import { BadgeCheck } from "lucide-react";
import { formatCalendarDate } from "@/domain/dates";

// "Contact confirmed" means exactly one thing, and the page says so.
export function ContactConfirmed({ at }: { at: Date | null }) {
  if (!at) {
    return (
      <details className="text-sm">
        <summary className="cursor-pointer text-muted underline decoration-dotted underline-offset-2">Contact not yet confirmed</summary>
        <p className="mt-1 max-w-prose text-muted">
          A KitGap reviewer approved this request, but hasn't yet confirmed the organization's contact details by phone or email.
        </p>
      </details>
    );
  }
  return (
    <details className="text-sm">
      <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-forest">
        <BadgeCheck aria-hidden className="size-4" />
        Contact confirmed
      </summary>
      <p className="mt-1 max-w-prose text-muted">
        A KitGap reviewer confirmed on {formatCalendarDate(at.toISOString().slice(0, 10))} that this organization's contact person is
        real and reachable. It is not a check of tax status, a government endorsement, or an audit.
      </p>
    </details>
  );
}
