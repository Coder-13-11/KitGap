import "server-only";

// How far a shared need or drive travelled: one number per page per day.
// Nothing about the visitor is stored. If the table isn't there yet (a
// database before migration 0006), counting quietly does nothing.

import { isUuid, type ServiceContext } from "../services/core";
import { inSchema } from "../db/client";

export type ReachSubject = "request" | "drive";

export async function recordView(ctx: ServiceContext, subject: ReachSubject, id: string): Promise<void> {
  if (!isUuid(id)) return;
  try {
    await inSchema(ctx.sql, ctx.schema, async (tx) => {
      await tx`
        insert into page_views (subject_type, subject_id, day, views)
        values (${subject}, ${id}, current_date, 1)
        on conflict (subject_type, subject_id, day) do update set views = page_views.views + 1
      `;
    });
  } catch {
    // Counting views must never break the page.
  }
}

export async function viewCount(ctx: ServiceContext, subject: ReachSubject, id: string): Promise<number | null> {
  if (!isUuid(id)) return null;
  try {
    return await inSchema(ctx.sql, ctx.schema, async (tx) => {
      const [row] = await tx`
        select coalesce(sum(views), 0)::int as total from page_views where subject_type = ${subject} and subject_id = ${id}
      `;
      return Number(row?.total ?? 0);
    });
  } catch {
    return null;
  }
}
