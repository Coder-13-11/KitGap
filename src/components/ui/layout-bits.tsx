import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "./cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="text-sm font-semibold text-muted">{eyebrow}</div> : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-[2.25rem] break-words">{title}</h1>
        {description ? <div className="max-w-2xl text-lg text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id={id ? `${id}-title` : undefined} className="text-xl font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  children,
  className,
  as: As = "div",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  tone?: "default" | "forest";
}) {
  const toneClass = tone === "forest" ? "border-forest/25 bg-forest-tint" : "border-line-strong bg-surface";
  return <As className={cn("tag-shape border p-5 shadow-card sm:p-6", toneClass, className)}>{children}</As>;
}

export function Container({ children, className, narrow = false }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}>{children}</div>;
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rise tag-shape relative overflow-hidden border border-line-strong bg-surface px-6 py-10 text-center shadow-card">
      <div className="relative">
        <div
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-[3px_10px_10px_3px] bg-forest text-white shadow-card [&_svg]:size-6"
        >
          {icon ?? <Inbox />}
        </div>
        <p className="mt-4 font-serif text-xl font-semibold text-ink">{title}</p>
        {children ? <div className="mx-auto mt-1 max-w-prose text-muted">{children}</div> : null}
        {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
