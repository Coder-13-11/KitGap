import type { ReactNode } from "react";
import { Container } from "../ui/layout-bits";

export function AuthShell({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Container className="max-w-md">
      <div className="space-y-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? <div className="text-muted">{description}</div> : null}
        </div>
        {children}
      </div>
      {footer ? <div className="mt-4 space-y-2 text-center text-sm">{footer}</div> : null}
    </Container>
  );
}
