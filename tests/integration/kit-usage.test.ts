// Kit's daily AI caps, run against a throwaway schema (never the live one).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { allowKitUse, PER_CALLER_DAILY } from "@/server/kit/usage";
import { createHarness, type Harness } from "./harness";

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.close();
});

describe("Kit's daily AI caps", () => {
  it("counts each use per caller and stops at the daily cap", async () => {
    const at = { sql: h.sql, schema: h.schema };
    // Start just below the cap so the test stays quick.
    await h.sql`
      insert into ${h.sql(`${h.schema}.ai_usage`)} (caller, day, kind, count)
      values ('user:a', current_date, 'voice', ${PER_CALLER_DAILY.voice - 2})
    `;
    expect(await allowKitUse("user:a", "voice", at)).toBe(true); // cap - 1
    expect(await allowKitUse("user:a", "voice", at)).toBe(true); // cap
    expect(await allowKitUse("user:a", "voice", at)).toBe(false); // over
    // Someone else, and another kind of use, are counted separately.
    expect(await allowKitUse("demo:b", "voice", at)).toBe(true);
    expect(await allowKitUse("user:a", "ai", at)).toBe(true);
    const rows = await h.sql`select caller, kind, count from ${h.sql(`${h.schema}.ai_usage`)} order by caller, kind`;
    expect(rows.map((r) => [r.caller, r.kind, r.count])).toEqual([
      ["demo:b", "voice", 1],
      ["user:a", "ai", 1],
      ["user:a", "voice", PER_CALLER_DAILY.voice + 1],
    ]);
  });

  it("falls back to allowing (the per-minute limit still applies) when the table is missing", async () => {
    expect(await allowKitUse("user:a", "ai", { sql: h.sql, schema: "kgdemo_missing_schema" })).toBe(true);
  });
});
