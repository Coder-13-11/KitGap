// The "Try the demo" sandbox. Each visitor gets a private Postgres schema
// built from the same migrations as the real app and filled with clearly
// labelled sample data. Demo transactions set search_path to that schema
// only, so they cannot read or change real data or another visitor's sandbox.
//
// What this proves and what it doesn't: the demo runs the real server code
// (the same rules, locks and checks). The people in it are fixed sample
// personas, so it does not exercise real sign-in; see docs/testing.md.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { addDays, todayIn } from "@/domain/dates";
import { normalizeItemKey } from "@/domain/text";
import { inSchema, isSandboxSchema, type Sql, type Tx } from "../db/client";
import { dropSchema, ensureMetaSchema, loadMigrations, migrateSchema } from "../db/migrations";
import { newInviteToken } from "../services/workspaces";

export const DEMO_COOKIE = "kg_demo";
export const DEMO_PERSONA_COOKIE = "kg_demo_as";
const MAX_SANDBOXES = 300;
const IDLE_HOURS = 24;

export type PersonaKey = "organization" | "coordinator" | "contributor" | "reviewer";

export interface Persona {
  key: PersonaKey;
  userId: string;
  name: string;
  short: string;
  role: string;
  description: string;
  home: string;
}

// Fixed ids: each sandbox is its own schema, so the same ids never collide.
export const DEMO_IDS = {
  maya: "00000000-0000-4000-8000-00000000a001",
  jordan: "00000000-0000-4000-8000-00000000a002",
  sam: "00000000-0000-4000-8000-00000000a003",
  riley: "00000000-0000-4000-8000-00000000a004",
  dana: "00000000-0000-4000-8000-00000000a005",
  org: "00000000-0000-4000-8000-00000000b001",
  group: "00000000-0000-4000-8000-00000000b002",
  shelter: "00000000-0000-4000-8000-00000000b003",
  kitRequest: "00000000-0000-4000-8000-00000000c001",
  itemRequest: "00000000-0000-4000-8000-00000000c002",
  hatComponent: "00000000-0000-4000-8000-00000000c102",
  hatDrive: "00000000-0000-4000-8000-00000000d001",
  hatImport: "00000000-0000-4000-8000-00000000e001",
};

export const PERSONAS: Persona[] = [
  {
    key: "organization",
    short: "receiving organization",
    userId: DEMO_IDS.maya,
    name: "Maya Ortiz",
    role: "Program director, Riverbend Family Center (sample)",
    description: "Posts the request and confirms what arrives.",
    home: `/organization/${DEMO_IDS.org}`,
  },
  {
    key: "coordinator",
    short: "club coordinator",
    userId: DEMO_IDS.jordan,
    name: "Jordan Lee",
    role: "Coordinator, Lakeside High Service Club (sample)",
    description: "Adopts part of the request and runs the drive.",
    home: `/requests/${DEMO_IDS.kitRequest}`,
  },
  {
    key: "contributor",
    short: "club member",
    userId: DEMO_IDS.sam,
    name: "Sam Patel",
    role: "Member, Lakeside High Service Club (sample)",
    description: "Pledges supplies toward the club's kits.",
    home: "/drives",
  },
  {
    key: "reviewer",
    short: "KitGap reviewer",
    userId: DEMO_IDS.riley,
    name: "Riley Chen",
    role: "KitGap reviewer (sample)",
    description: "Checks new requests before they're listed.",
    home: "/admin",
  },
];

export function personaFor(key: string | undefined | null): Persona {
  return PERSONAS.find((p) => p.key === key) ?? PERSONAS[1];
}

function secret(): string {
  const value = process.env.DEMO_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error("DEMO_COOKIE_SECRET must be set to a random string of at least 32 characters.");
  }
  return value;
}

export function schemaFor(sandboxId: string): string {
  return `kgdemo_${sandboxId}`;
}

export function signSandboxId(sandboxId: string): string {
  const signature = createHmac("sha256", secret()).update(sandboxId).digest("base64url");
  return `${sandboxId}.${signature}`;
}

export function verifySandboxCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature || !/^[0-9a-f]{24}$/.test(id)) return null;
  const expected = createHmac("sha256", secret()).update(id).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}

export async function sandboxExists(sql: Sql, sandboxId: string): Promise<boolean> {
  const schema = schemaFor(sandboxId);
  const ok = await sandboxRow(sql, schema);
  if (ok) {
    // A sandbox made before a new migration shipped gets it on next use.
    const [{ count }] = await sql`select count(*)::int as count from kitgap_meta.applied_migrations where schema_name = ${schema}`;
    if (Number(count) < loadMigrations().length) await migrateSchema(sql, schema);
  }
  return ok;
}

async function sandboxRow(sql: Sql, schema: string): Promise<boolean> {
  const rows = await sql`
    update kitgap_meta.demo_sandboxes set last_used_at = now()
    where schema_name = ${schema} and last_used_at < now() - interval '5 minutes'
    returning schema_name
  `;
  if (rows.length > 0) return true;
  const [row] = await sql`select 1 as ok from kitgap_meta.demo_sandboxes where schema_name = ${schema}`;
  return Boolean(row);
}

export async function createSandbox(sql: Sql, existingId?: string): Promise<string> {
  await ensureMetaSchema(sql);
  await cleanupSandboxes(sql);
  const sandboxId = existingId ?? randomBytes(12).toString("hex");
  const schema = schemaFor(sandboxId);
  if (!isSandboxSchema(schema)) throw new Error("bad sandbox id");
  await dropSchema(sql, schema);
  await migrateSchema(sql, schema);
  await inSchema(sql, schema, (tx) => seedDemo(tx));
  await sql`
    insert into kitgap_meta.demo_sandboxes (schema_name) values (${schema})
    on conflict (schema_name) do update set created_at = now(), last_used_at = now()
  `;
  return sandboxId;
}

// Removes sandboxes nobody has used for a day, and the oldest ones beyond the cap.
export async function cleanupSandboxes(sql: Sql): Promise<number> {
  const stale = await sql`
    select schema_name from kitgap_meta.demo_sandboxes
    where last_used_at < now() - make_interval(hours => ${IDLE_HOURS})
    union
    select schema_name from (
      select schema_name from kitgap_meta.demo_sandboxes order by last_used_at desc offset ${MAX_SANDBOXES}
    ) overflow
    limit 25
  `;
  for (const row of stale) {
    const schema = row.schemaName as string;
    if (!isSandboxSchema(schema)) continue;
    await dropSchema(sql, schema);
    await sql`delete from kitgap_meta.demo_sandboxes where schema_name = ${schema}`;
  }
  return stale.length;
}

// The starting state of every sandbox: one 100-kit school-supply request
// (1 backpack, 2 notebooks, 1 pencil pack per kit) with no drives yet, and
// one single-item request the club already has a small drive for. Every
// name is fictional.
export async function seedDemo(tx: Tx, now: Date = new Date()): Promise<void> {
  const timezone = "America/New_York";
  const today = todayIn(timezone, now);
  for (const persona of PERSONAS) {
    await tx`insert into profiles (id, display_name) values (${persona.userId}, ${persona.name})`;
  }
  // Dana manages the second sample organization; she is not a selectable persona.
  await tx`insert into profiles (id, display_name) values (${DEMO_IDS.dana}, ${"Dana Brooks"})`;
  await tx`insert into platform_admins (user_id) values (${DEMO_IDS.riley})`;

  await tx`
    insert into workspaces ${tx([
      {
        id: DEMO_IDS.org,
        kind: "organization",
        name: "Riverbend Family Center (sample)",
        city: "Kissimmee, FL",
        about: "A fictional family resource center used to demonstrate KitGap. It is not a real organization.",
        contactName: "Maya Ortiz",
        contactEmail: "maya@riverbend.example",
        contactPhone: "(407) 555-0142",
        contactConfirmedAt: now,
        contactConfirmedBy: DEMO_IDS.riley,
        inviteToken: newInviteToken(),
        createdBy: DEMO_IDS.maya,
      },
      {
        id: DEMO_IDS.shelter,
        kind: "organization",
        name: "Northside Family Shelter (sample)",
        city: "St. Cloud, FL",
        about: "A fictional shelter used to demonstrate single-item requests.",
        contactName: "Dana Brooks",
        contactEmail: "dana@northside.example",
        contactPhone: "",
        contactConfirmedAt: null,
        contactConfirmedBy: null,
        inviteToken: newInviteToken(),
        createdBy: DEMO_IDS.dana,
      },
      {
        id: DEMO_IDS.group,
        kind: "group",
        name: "Lakeside High Service Club (sample)",
        city: "Kissimmee, FL",
        about: "A fictional student service club.",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactConfirmedAt: null,
        contactConfirmedBy: null,
        inviteToken: newInviteToken(),
        createdBy: DEMO_IDS.jordan,
      },
    ])}
  `;
  await tx`
    insert into workspace_members ${tx([
      { workspaceId: DEMO_IDS.org, userId: DEMO_IDS.maya, role: "admin" },
      { workspaceId: DEMO_IDS.shelter, userId: DEMO_IDS.dana, role: "admin" },
      { workspaceId: DEMO_IDS.group, userId: DEMO_IDS.jordan, role: "admin" },
      { workspaceId: DEMO_IDS.group, userId: DEMO_IDS.sam, role: "member" },
    ])}
  `;

  await tx`
    insert into requests ${tx({
      id: DEMO_IDS.kitRequest,
      orgId: DEMO_IDS.org,
      title: "School-supply kits for students starting mid-year",
      need: "Families who move to our area during the school year often arrive without school supplies. A complete kit lets each child start class with what the teacher expects on day one.",
      beneficiaries: "Elementary and middle school students enrolled in our family support program",
      category: "school_supplies",
      requestType: "kit",
      unitName: "kit",
      targetQuantity: 100,
      conditionNotes: "New items only, in original packaging where possible.",
      substitutions: "Any color backpack is fine. College-ruled notebooks are fine instead of wide-ruled.",
      neededBy: addDays(today, 28),
      timezone,
      location: "Kissimmee, FL",
      handoverInstructions: "Drop off at the side entrance (Door C), Monday to Thursday, 3:00 to 5:30 pm. Ask for Maya at the front desk.",
      coordinatorContact: "Maya Ortiz, (407) 555-0142, maya@riverbend.example",
      fundraisingUrl: null,
      status: "published",
      submittedAt: now,
      publishedAt: now,
      reviewedBy: DEMO_IDS.riley,
      createdBy: DEMO_IDS.maya,
    })}
  `;
  await tx`
    insert into request_components ${tx([
      { requestId: DEMO_IDS.kitRequest, position: 0, name: "Backpack", normalizedKey: normalizeItemKey("Backpack"), quantityPerUnit: 1, details: "New, child size" },
      { requestId: DEMO_IDS.kitRequest, position: 1, name: "Notebook", normalizedKey: normalizeItemKey("Notebook"), quantityPerUnit: 2, details: "Spiral, wide-ruled, 70 sheets" },
      { requestId: DEMO_IDS.kitRequest, position: 2, name: "Pencil pack", normalizedKey: normalizeItemKey("Pencil pack"), quantityPerUnit: 1, details: "Pack of 10 sharpened #2 pencils" },
    ])}
  `;

  await tx`
    insert into requests ${tx({
      id: DEMO_IDS.itemRequest,
      orgId: DEMO_IDS.shelter,
      title: "Warm hats for children at the shelter",
      need: "Children staying with us walk to the bus stop early in the morning. Many arrive without a hat for the colder months.",
      beneficiaries: "Children ages 4 to 12 staying at the shelter with their families",
      category: "winter",
      requestType: "item",
      unitName: "Child's knit hat",
      targetQuantity: 60,
      conditionNotes: "New only.",
      substitutions: "Fleece hats are fine.",
      neededBy: addDays(today, 45),
      timezone,
      location: "St. Cloud, FL",
      handoverInstructions: "Leave with the front desk any day, 9 am to 7 pm.",
      coordinatorContact: "Dana Brooks, dana@northside.example",
      fundraisingUrl: null,
      status: "published",
      submittedAt: now,
      publishedAt: now,
      reviewedBy: DEMO_IDS.riley,
      createdBy: DEMO_IDS.dana,
    })}
  `;
  await tx`
    insert into request_components ${tx({
      id: DEMO_IDS.hatComponent,
      requestId: DEMO_IDS.itemRequest,
      position: 0,
      name: "Child's knit hat",
      normalizedKey: normalizeItemKey("Child's knit hat"),
      quantityPerUnit: 1,
      details: "Ages 4 to 12, any color",
    })}
  `;

  // The club already runs a small hat drive, with one sign-up brought in from
  // a sample Google Forms export, so the import shows up without any setup.
  await tx`
    insert into commitments ${tx({ id: DEMO_IDS.hatDrive, requestId: DEMO_IDS.itemRequest, groupId: DEMO_IDS.group, quantity: 15, createdBy: DEMO_IDS.jordan })}
  `;
  await tx`
    insert into import_batches ${tx({
      id: DEMO_IDS.hatImport,
      commitmentId: DEMO_IDS.hatDrive,
      source: "google_forms_csv",
      fileName: "hat-drive-sign-ups (sample).csv",
      createdCount: 1,
      skippedCount: 0,
      createdBy: DEMO_IDS.jordan,
    })}
  `;
  await tx`
    insert into pledges ${tx({
      commitmentId: DEMO_IDS.hatDrive,
      componentId: DEMO_IDS.hatComponent,
      userId: null,
      guestName: "Priya N. (sample)",
      guestEmail: "priya.sample@example.com",
      importSource: "google_forms_csv",
      sourceRowId: "sample-row-1",
      importBatchId: DEMO_IDS.hatImport,
      quantity: 4,
      note: "Sample sign-up from a Google Form",
    })}
  `;
  const activity = [
    { kind: "drive.started", audience: "both", data: { quantity: 15 } },
    { kind: "pledges.imported", audience: "group", data: { source: "google_forms_csv", count: 1, quantity: 4, overCap: 0, duplicates: 0 } },
  ];
  for (const a of activity) {
    await tx`
      insert into activity (kind, audience, actor_id, request_id, commitment_id, workspace_id, data)
      values (${a.kind}, ${a.audience}, ${DEMO_IDS.jordan}, ${DEMO_IDS.itemRequest}, ${DEMO_IDS.hatDrive}, ${DEMO_IDS.group}, ${tx.json(a.data)})
    `;
  }
}
