import "server-only";

// Daily caps on Kit's paid AI calls, kept in the database so they hold across
// every server instance. Over a cap, Kit answers from its written rules and
// speaks with the browser's own voice instead. The counts live in the live
// schema's ai_usage table (migration 0007). If they can't be checked, for
// example before that migration is applied, the per-minute in-memory limits
// still apply: never unlimited.

import { db, LIVE_SCHEMA, type Sql } from "../db/client";

export type KitUse = "ai" | "voice";

/** Per person (or demo sandbox) per day. */
export const PER_CALLER_DAILY: Record<KitUse, number> = { ai: 150, voice: 120 };
/** For the whole site per day, a ceiling on cost. */
const SITE_DAILY = 5000;

export async function allowKitUse(caller: string, kind: KitUse, at: { sql?: Sql; schema?: string } = {}): Promise<boolean> {
  try {
    const sql = at.sql ?? db();
    const table = sql(`${at.schema ?? LIVE_SCHEMA}.ai_usage`);
    const [row] = await sql`
      with used as (
        insert into ${table} as u (caller, day, kind, count)
        values (${caller.slice(0, 80)}, current_date, ${kind}, 1)
        on conflict (caller, day, kind) do update set count = u.count + 1
        returning count
      )
      select (select count from used) as mine,
             (select coalesce(sum(count), 0)::int from ${table} where day = current_date) as site
    `;
    return Number(row.mine) <= PER_CALLER_DAILY[kind] && Number(row.site) < SITE_DAILY;
  } catch {
    return true;
  }
}
