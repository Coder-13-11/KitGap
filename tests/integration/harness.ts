// Gives each integration test file its own freshly migrated schema in the
// test database, plus helpers to act as different people.

import { randomBytes, randomUUID } from "node:crypto";
import { createSql, type Sql } from "@/server/db/client";
import { dropSchema, migrateSchema } from "@/server/db/migrations";
import type { ServiceContext } from "@/server/services/core";
import { createRequestDraft, submitRequestForReview, approveRequest } from "@/server/services/requests";
import { createWorkspace, joinWorkspace } from "@/server/services/workspaces";
import { EMPTY_REQUEST_INPUT, type RequestInput } from "@/domain/request-input";
import { addDays, todayIn } from "@/domain/dates";

export interface Harness {
  sql: Sql;
  schema: string;
  as(userId: string | null): ServiceContext;
  person(name: string, options?: { reviewer?: boolean }): Promise<string>;
  close(): Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run integration tests");
  const sql = createSql(url, { max: 8 });
  // Test schemas use the sandbox naming pattern so the app accepts them.
  const schema = `kgdemo_${randomBytes(12).toString("hex")}`;
  await migrateSchema(sql, schema);
  return {
    sql,
    schema,
    as: (userId) => ({ sql, schema, userId }),
    async person(name, options = {}) {
      const id = randomUUID();
      await sql.begin(async (tx) => {
        await tx`select set_config('search_path', ${schema}, true)`;
        await tx`insert into profiles (id, display_name) values (${id}, ${name})`;
        if (options.reviewer) await tx`insert into platform_admins (user_id) values (${id})`;
      });
      return id;
    },
    async close() {
      await dropSchema(sql, schema);
      await sql.end();
    },
  };
}

export function kitRequestInput(overrides: Partial<RequestInput> = {}): RequestInput {
  const neededBy = addDays(todayIn("America/New_York"), 30);
  return {
    ...EMPTY_REQUEST_INPUT,
    title: "School-supply kits for incoming students",
    need: "Families arriving mid-year need basic supplies so children can start class ready to learn.",
    beneficiaries: "Elementary students in our after-school program",
    category: "school_supplies",
    requestType: "kit",
    unitName: "kit",
    targetQuantity: "100",
    components: [
      { name: "Backpack", quantityPerUnit: "1", details: "New, any color" },
      { name: "Notebook", quantityPerUnit: "2", details: "Wide-ruled" },
      { name: "Pencil pack", quantityPerUnit: "1", details: "10 pencils" },
    ],
    neededBy,
    timezone: "America/New_York",
    location: "Kissimmee, FL",
    handoverInstructions: "Bring kits to the front office, Room 12, weekdays 3-5pm.",
    coordinatorContact: "Ms. Rivera, (407) 555-0100",
    ...overrides,
  };
}

// An organization with a published 100-kit request, two coordinators with a
// group each, a contributor in group A, an outsider and a reviewer.
export async function standardScenario(h: Harness, input: RequestInput = kitRequestInput()) {
  const reviewer = await h.person("Riley Reviewer", { reviewer: true });
  const orgManager = await h.person("Maya Manager");
  const orgStaff = await h.person("Omar Staff");
  const coordA = await h.person("Jordan Coordinator");
  const coordB = await h.person("Bea Coordinator");
  const contributor = await h.person("Sam Contributor");
  const outsider = await h.person("Olive Outsider");

  const { workspaceId: orgId } = await createWorkspace(h.as(orgManager), {
    kind: "organization",
    name: "Riverside Family Center",
    city: "Kissimmee, FL",
    contactName: "Maya Manager",
    contactEmail: "maya@example.org",
  });
  const { workspaceId: groupA } = await createWorkspace(h.as(coordA), { kind: "group", name: "Key Club A", city: "Kissimmee, FL" });
  const { workspaceId: groupB } = await createWorkspace(h.as(coordB), { kind: "group", name: "Robotics B", city: "St. Cloud, FL" });

  const tokens = await h.sql.begin(async (tx) => {
    await tx`select set_config('search_path', ${h.schema}, true)`;
    return tx`select id, invite_token from workspaces`;
  });
  const token = (id: string) => tokens.find((t) => t.id === id)!.inviteToken as string;
  await joinWorkspace(h.as(contributor), { token: token(groupA) });
  await joinWorkspace(h.as(orgStaff), { token: token(orgId) });

  const { requestId } = await createRequestDraft(h.as(orgManager), { orgId, fields: input });
  await submitRequestForReview(h.as(orgManager), { requestId, fields: input });
  await approveRequest(h.as(reviewer), { requestId });

  return { reviewer, orgManager, orgStaff, coordA, coordB, contributor, outsider, orgId, groupA, groupB, requestId, token };
}
