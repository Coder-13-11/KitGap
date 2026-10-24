import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSql, LIVE_SCHEMA, type Sql } from "@/server/db/client";
import { dropSchema, migrateSchema } from "@/server/db/migrations";
import {
  DEMO_IDS,
  createSandbox,
  schemaFor,
  signSandboxId,
  verifySandboxCookie,
} from "@/server/demo/sandbox";
import { getDriveWorkspace } from "@/server/queries/drives";
import { getRequestDetail, listPublicRequests } from "@/server/queries/requests";
import { adoptRequest } from "@/server/services/drives";

let sql: Sql;
const created: string[] = [];

beforeAll(async () => {
  process.env.DEMO_COOKIE_SECRET ??= "test-secret-test-secret-test-secret-1234";
  sql = createSql(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!, { max: 4 });
  await migrateSchema(sql, LIVE_SCHEMA);
});

afterAll(async () => {
  for (const id of created) {
    await dropSchema(sql, schemaFor(id));
    await sql`delete from kitgap_meta.demo_sandboxes where schema_name = ${schemaFor(id)}`;
  }
  await sql.end();
});

async function liveCounts() {
  return sql.begin(async (tx) => {
    await tx`select set_config('search_path', ${LIVE_SCHEMA}, true)`;
    const [row] = await tx`
      select (select count(*) from commitments)::int as commitments,
             (select count(*) from requests)::int as requests,
             (select count(*) from profiles)::int as profiles
    `;
    return row;
  });
}

describe("demo sandboxes", () => {
  it("start from the same clean sample state", async () => {
    const a = await createSandbox(sql);
    created.push(a);
    const detail = await getRequestDetail({ sql, schema: schemaFor(a), userId: null }, DEMO_IDS.kitRequest);
    expect(detail!.request.title).toBe("School-supply kits for students starting mid-year");
    expect(detail!.totals).toMatchObject({ target: 100, accepted: 0, reserved: 0, available: 100 });
    expect(detail!.supply.map((s) => [s.name, s.total])).toEqual([
      ["Backpack", 100],
      ["Notebook", 200],
      ["Pencil pack", 100],
    ]);
    expect(detail!.org.name).toContain("(sample)");
  });

  it("includes a club drive with one sample sign-up imported from Google Forms", async () => {
    const a = await createSandbox(sql);
    created.push(a);
    const asJordan = await getDriveWorkspace({ sql, schema: schemaFor(a), userId: DEMO_IDS.jordan }, DEMO_IDS.hatDrive);
    if (!asJordan || asJordan === "not_allowed") throw new Error("expected Jordan to see the drive");
    expect(asJordan.pledges).toHaveLength(1);
    expect(asJordan.pledges[0]).toMatchObject({ contributorName: "Priya N. (sample)", quantity: 4, imported: { source: "Google Forms" } });
    expect(asJordan.progress.components[0]).toMatchObject({ needed: 15, collected: 0, openPledged: 4, uncovered: 11 });
    const asSam = await getDriveWorkspace({ sql, schema: schemaFor(a), userId: DEMO_IDS.sam }, DEMO_IDS.hatDrive);
    if (!asSam || asSam === "not_allowed") throw new Error("expected Sam to see the drive");
    expect(asSam.pledges).toEqual([]);
  });

  it("changes in one sandbox don't reach real data or another visitor's sandbox", async () => {
    const before = await liveCounts();
    const a = await createSandbox(sql);
    const b = await createSandbox(sql);
    created.push(a, b);

    await adoptRequest(
      { sql, schema: schemaFor(a), userId: DEMO_IDS.jordan },
      { requestId: DEMO_IDS.kitRequest, groupId: DEMO_IDS.group, quantity: 20 },
    );

    const inA = await getRequestDetail({ sql, schema: schemaFor(a), userId: null }, DEMO_IDS.kitRequest);
    const inB = await getRequestDetail({ sql, schema: schemaFor(b), userId: null }, DEMO_IDS.kitRequest);
    expect(inA!.totals.available).toBe(80);
    expect(inB!.totals.available).toBe(100);
    expect(await liveCounts()).toEqual(before);

    // Sample requests never appear in the real directory.
    const live = await listPublicRequests({ sql, schema: LIVE_SCHEMA, userId: null }, { status: "all" });
    expect(live.some((r) => r.request.id === DEMO_IDS.kitRequest)).toBe(false);
  });

  it("reset rebuilds the sandbox in its starting state", async () => {
    const a = await createSandbox(sql);
    created.push(a);
    await adoptRequest(
      { sql, schema: schemaFor(a), userId: DEMO_IDS.jordan },
      { requestId: DEMO_IDS.kitRequest, groupId: DEMO_IDS.group, quantity: 30 },
    );
    await createSandbox(sql, a);
    const detail = await getRequestDetail({ sql, schema: schemaFor(a), userId: null }, DEMO_IDS.kitRequest);
    expect(detail!.totals.available).toBe(100);
  });

  it("a demo persona has no power in the real app", async () => {
    // The sample coordinator's id doesn't exist in real data, so the same call fails there.
    await expect(
      adoptRequest({ sql, schema: LIVE_SCHEMA, userId: DEMO_IDS.jordan }, { requestId: DEMO_IDS.kitRequest, groupId: DEMO_IDS.group, quantity: 5 }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("only accepts sandbox cookies this server signed", () => {
    const id = "0123456789abcdef01234567";
    expect(verifySandboxCookie(signSandboxId(id))).toBe(id);
    expect(verifySandboxCookie(`${id}.forged-signature`)).toBeNull();
    expect(verifySandboxCookie(`../../kitgap.${signSandboxId(id).split(".")[1]}`)).toBeNull();
    expect(verifySandboxCookie("kitgap")).toBeNull();
  });
});
