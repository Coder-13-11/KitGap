// The demo's sample community board. Only touches a throwaway sandbox schema,
// never the real "kitgap" schema.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSql, type Sql } from "@/server/db/client";
import { dropSchema } from "@/server/db/migrations";
import { DEMO_IDS, createSandbox, schemaFor } from "@/server/demo/sandbox";
import { getPublicDrive } from "@/server/queries/drives";
import { getRequestDetail, listPublicRequests } from "@/server/queries/requests";
import { assertInvariants, read } from "@/server/services/core";

let sql: Sql;
let sandbox: string;

beforeAll(async () => {
  process.env.DEMO_COOKIE_SECRET ??= "test-secret-test-secret-test-secret-1234";
  sql = createSql(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!, { max: 4 });
  sandbox = await createSandbox(sql);
});

afterAll(async () => {
  if (sandbox) {
    await dropSchema(sql, schemaFor(sandbox));
    await sql`delete from kitgap_meta.demo_sandboxes where schema_name = ${schemaFor(sandbox)}`;
  }
  await sql.end();
});

describe("the demo's community board", () => {
  it("shows food, senior and pet needs alongside the school and winter ones", async () => {
    const ctx = { sql, schema: schemaFor(sandbox), userId: null };
    const open = await listPublicRequests(ctx, { status: "open" });
    expect(new Set(open.map((r) => r.request.category))).toEqual(new Set(["school_supplies", "winter", "food", "seniors", "pets"]));
  });

  it("has a food pantry need whose 12 confirmed bags add up under every rule", async () => {
    const ctx = { sql, schema: schemaFor(sandbox), userId: null };
    const detail = await getRequestDetail(ctx, DEMO_IDS.pantryRequest);
    expect(detail?.totals).toMatchObject({ target: 40, accepted: 12, reserved: 8, available: 20 });
    const drive = await getPublicDrive(ctx, DEMO_IDS.pantryDrive);
    expect(drive?.progress.stages).toMatchObject({ accepted: 12, pendingReview: 0, ready: 0 });
    // The same safety net every real change passes.
    await read(ctx, async (tx) => {
      await assertInvariants(tx, DEMO_IDS.pantryRequest, DEMO_IDS.pantryDrive);
    });
  });
});
