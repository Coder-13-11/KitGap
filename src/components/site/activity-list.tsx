import { formatTimestamp } from "@/domain/dates";
import type { ActivityItem } from "@/server/queries/activity";
import { ShowMore } from "../ui/show-more";

export function ActivityList({
  items,
  timezone,
  showContext = false,
  limit,
}: {
  items: ActivityItem[];
  timezone: string;
  showContext?: boolean;
  // Show only the newest few and fold the rest away, so long drives stay short on a phone.
  limit?: number;
}) {
  if (items.length === 0) return <p className="text-muted">Nothing has happened yet.</p>;
  const row = (item: ActivityItem) => (
    <li key={item.id} className="relative">
      <span aria-hidden className="absolute top-2 -left-[1.4rem] size-2.5 rounded-full bg-line-strong" />
      <p>
        <span className="font-semibold">{item.actorName}</span> {item.text}
        {showContext && item.context ? <span className="text-muted"> · {item.context}</span> : null}
      </p>
      <p className="text-sm text-muted">{formatTimestamp(item.createdAt, timezone)}</p>
    </li>
  );
  const shown = limit ? items.slice(0, limit) : items;
  const rest = limit ? items.slice(limit) : [];
  return (
    <div className="space-y-3">
      <ol className="space-y-3 border-l-2 border-line pl-4">{shown.map(row)}</ol>
      {rest.length > 0 ? (
        <ShowMore count={rest.length} noun="older update">
          <ol className="space-y-3 border-l-2 border-line pl-4">{rest.map(row)}</ol>
        </ShowMore>
      ) : null}
    </div>
  );
}
