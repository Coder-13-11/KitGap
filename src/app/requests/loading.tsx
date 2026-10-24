import { Container } from "@/components/ui/layout-bits";

export default function Loading() {
  return (
    <Container className="space-y-6">
      <p className="sr-only" role="status">
        Loading requests
      </p>
      <div aria-hidden="true" className="space-y-3">
        <div className="skeleton h-10 w-64 rounded-lg" />
        <div className="skeleton h-6 w-96 max-w-full rounded-lg" />
      </div>
      <div aria-hidden="true" className="skeleton h-20 rounded-xl" />
      <ul aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="space-y-3 rounded-xl border border-line/80 bg-surface p-5 shadow-card">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-6 w-4/5 rounded-md" />
            <div className="skeleton h-4 w-3/5 rounded-md" />
            <div className="skeleton h-20 rounded-lg" />
            <div className="skeleton h-4 w-2/5 rounded-md" />
          </li>
        ))}
      </ul>
    </Container>
  );
}
