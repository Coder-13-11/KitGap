import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

const TONE = {
  info: { box: "bg-info-tint border-info/30 text-ink", icon: Info, iconClass: "text-info" },
  success: { box: "bg-forest-tint border-forest/30 text-ink", icon: CheckCircle2, iconClass: "text-forest" },
  warning: { box: "bg-amber-tint border-amber/30 text-ink", icon: AlertTriangle, iconClass: "text-amber" },
  error: { box: "bg-danger-tint border-danger/40 text-ink", icon: XCircle, iconClass: "text-danger" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  live,
  className,
  id,
}: {
  tone?: keyof typeof TONE;
  title?: ReactNode;
  children?: ReactNode;
  // "polite" for success messages after an action; leave unset for static notes.
  live?: "polite" | "assertive";
  className?: string;
  id?: string;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <div
      id={id}
      role={live === "assertive" ? "alert" : live === "polite" ? "status" : undefined}
      className={cn("appear flex gap-3 rounded-lg border px-4 py-3", t.box, className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", t.iconClass)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-[0.95rem] leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
