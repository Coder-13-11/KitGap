import { ArrowRight } from "lucide-react";
import { LogoMark } from "../site/logo";
import { AppLink } from "../ui/base";

// The way in to Kit, shown to the people running a need.
export function AskKitCard({ requestId, line }: { requestId: string; line?: string }) {
  return (
    <AppLink
      href={`/requests/${requestId}/kit`}
      className="tag-shape group flex items-center gap-3 border border-forest bg-forest px-4 py-4 text-white no-underline shadow-card hover:bg-forest-dark"
    >
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">
        <LogoMark className="kit-bob size-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lg leading-tight font-semibold">Ask Kit for help</span>
        <span className="block text-sm text-eyebrow">{line ?? "Why it's slow, Instagram posts, emails and partners, ready to send."}</span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </AppLink>
  );
}
