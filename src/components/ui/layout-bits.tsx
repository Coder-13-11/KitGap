import type { ReactNode } from "react";
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

export function Panel({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "aside" }) {
  return <As className={cn("rounded-lg border border-line bg-surface p-5", className)}>{children}</As>;
}

export function Container({ children, className, narrow = false }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}>{children}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-prose text-muted">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
