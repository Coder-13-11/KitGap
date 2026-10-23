import { Ban, CheckCircle2, CircleDashed, CircleDot, Clock3, Lock, PencilLine, Undo2 } from "lucide-react";
import { PHASE_LABEL, type RequestPhase } from "@/domain/phase";
import { cn } from "./cn";

const STYLE: Record<RequestPhase, { className: string; icon: typeof CircleDot }> = {
  draft: { className: "bg-sunken text-muted border-line", icon: PencilLine },
  returned: { className: "bg-amber-tint text-amber border-amber/30", icon: Undo2 },
  in_review: { className: "bg-info-tint text-info border-info/30", icon: Clock3 },
  open: { className: "bg-forest-tint text-forest-dark border-forest/30", icon: CircleDot },
  fully_committed: { className: "bg-info-tint text-info border-info/30", icon: CircleDashed },
  past_due: { className: "bg-amber-tint text-amber border-amber/30", icon: Clock3 },
  closed: { className: "bg-sunken text-ink border-line", icon: Lock },
  fulfilled: { className: "bg-forest text-white border-forest", icon: CheckCircle2 },
  cancelled: { className: "bg-danger-tint text-danger border-danger/30", icon: Ban },
};

export function PhaseBadge({ phase, className }: { phase: RequestPhase; className?: string }) {
  const { className: tone, icon: Icon } = STYLE[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {PHASE_LABEL[phase]}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "forest" | "amber" | "info" | "danger" | "clay" }) {
  const tones = {
    neutral: "bg-sunken text-ink border-line",
    forest: "bg-forest-tint text-forest-dark border-forest/30",
    amber: "bg-amber-tint text-amber border-amber/30",
    info: "bg-info-tint text-info border-info/30",
    danger: "bg-danger-tint text-danger border-danger/30",
    clay: "bg-clay-tint text-clay border-clay/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}
