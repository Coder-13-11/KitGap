import { formatTimestamp } from "@/domain/dates";
import type { ActivityItem } from "@/server/queries/activity";

export function ActivityList({ items, timezone, showContext = false }: { items: ActivityItem[]; timezone: string; showContext?: boolean }) {
  if (items.length === 0) return <p className="text-muted">Nothing has happened yet.</p>;
  return (
    <ol className="space-y-3 border-l-2 border-line pl-4">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span aria-hidden className="absolute top-2 -left-[1.4rem] size-2.5 rounded-full bg-line-strong" />
          <p>
            <span className="font-semibold">{item.actorName}</span> {item.text}
            {showContext && item.context ? <span className="text-muted"> · {item.context}</span> : null}
          </p>
          <p className="text-sm text-muted">{formatTimestamp(item.createdAt, timezone)}</p>
        </li>
      ))}
    </ol>
  );
}
