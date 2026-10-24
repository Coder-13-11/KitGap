import { Container } from "./layout-bits";

function Lines({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-line tag-shape border border-line-strong/40 bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="w-full space-y-2">
            <div className="skeleton h-5 w-2/5 rounded-md" />
            <div className="skeleton h-4 w-3/5 rounded-md" />
          </div>
          <div className="skeleton h-9 w-24 shrink-0 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

// What a page looks like while its data loads. The shapes are decorative;
// screen readers hear the label instead.
export function PageSkeleton({
  label,
  variant = "list",
  narrow = false,
}: {
  label: string;
  variant?: "list" | "dashboard" | "detail" | "home";
  narrow?: boolean;
}) {
  return (
    <Container narrow={narrow} className="space-y-8">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div aria-hidden="true" className="space-y-3">
        <div className="skeleton h-10 w-56 max-w-full rounded-lg" />
        <div className="skeleton h-5 w-80 max-w-full rounded-md" />
      </div>
      {variant === "home" ? (
        <div aria-hidden="true" className="space-y-6">
          <div className="skeleton h-40 tag-shape" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="skeleton h-36 tag-shape" />
            <div className="skeleton h-36 tag-shape" />
          </div>
          <Lines rows={3} />
        </div>
      ) : variant === "dashboard" ? (
        <div aria-hidden="true" className="space-y-6">
          <div className="skeleton h-44 tag-shape" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="skeleton h-20 tag-shape" />
            <div className="skeleton h-20 tag-shape" />
            <div className="skeleton h-20 tag-shape" />
          </div>
          <Lines rows={4} />
        </div>
      ) : variant === "detail" ? (
        <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="skeleton h-48 tag-shape" />
            <Lines rows={3} />
          </div>
          <div className="skeleton h-80 tag-shape" />
        </div>
      ) : (
        <div aria-hidden="true">
          <Lines rows={5} />
        </div>
      )}
    </Container>
  );
}
