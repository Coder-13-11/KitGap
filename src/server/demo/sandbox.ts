// The "Try the demo" sandbox. Each visitor gets a private Postgres schema
// built from the same migrations as the real app and filled with clearly
// labelled sample data. Demo transactions set search_path to that schema
// only, so they cannot read or change real data or another visitor's sandbox.
//
// The demo runs the real server code, but as fixed sample people, so it
// doesn't test real sign-in (tests/e2e/live-auth.spec.ts does).

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
  // More of the community: a food pantry part-way through a need, a senior
  // home and an animal rescue. Not selectable people; they fill the board.
  ana: "00000000-0000-4000-8000-00000000a006",
  grace: "00000000-0000-4000-8000-00000000a007",
  tom: "00000000-0000-4000-8000-00000000a008",
  leo: "00000000-0000-4000-8000-00000000a009",
  pantry: "00000000-0000-4000-8000-00000000b004",
  seniorHome: "00000000-0000-4000-8000-00000000b005",
  rescue: "00000000-0000-4000-8000-00000000b006",
  neighbors: "00000000-0000-4000-8000-00000000b007",
  pantryRequest: "00000000-0000-4000-8000-00000000c003",
  seniorRequest: "00000000-0000-4000-8000-00000000c004",
  rescueRequest: "00000000-0000-4000-8000-00000000c005",
  pantryDrive: "00000000-0000-4000-8000-00000000d002",
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

  // The club already runs a small hat drive, with one pledge from Sam.
  await tx`
    insert into commitments ${tx({ id: DEMO_IDS.hatDrive, requestId: DEMO_IDS.itemRequest, groupId: DEMO_IDS.group, quantity: 15, createdBy: DEMO_IDS.jordan })}
  `;
  await tx`
    insert into pledges ${tx({
      commitmentId: DEMO_IDS.hatDrive,
      componentId: DEMO_IDS.hatComponent,
      userId: DEMO_IDS.sam,
      quantity: 4,
      note: "My grandma is knitting these",
    })}
  `;
  const activity = [
    { kind: "drive.started", audience: "both", actor: DEMO_IDS.jordan, data: { quantity: 15 } },
    { kind: "pledge.created", audience: "group", actor: DEMO_IDS.sam, data: { component: "Child's knit hat", quantity: 4 } },
  ];
  for (const a of activity) {
    await tx`
      insert into activity (kind, audience, actor_id, request_id, commitment_id, workspace_id, data)
      values (${a.kind}, ${a.audience}, ${a.actor}, ${DEMO_IDS.itemRequest}, ${DEMO_IDS.hatDrive}, ${DEMO_IDS.group}, ${tx.json(a.data)})
    `;
  }

  await seedCommunity(tx, now, today, timezone);
  await seedViews(tx);
}

// Sample page views for the last two weeks, so the reach numbers and Kit's
// advice have something to work with. Made up, like everything in the demo.
// The school kits get plenty of views but few groups: Kit's "people look,
// but nobody offers" case. The dog food has barely been seen.
const SAMPLE_VIEWS: [string, number[]][] = [
  [DEMO_IDS.kitRequest, [4, 6, 3, 9, 12, 8, 5, 14, 11, 7, 16, 21, 13, 18]],
  [DEMO_IDS.pantryRequest, [2, 5, 8, 4, 6, 11, 9, 7, 12, 10, 15, 9, 14, 17]],
  [DEMO_IDS.seniorRequest, [1, 0, 2, 3, 1, 4, 2, 3, 5, 2, 4, 6, 3, 5]],
  [DEMO_IDS.rescueRequest, [0, 1, 0, 0, 2, 1, 0, 1, 0, 2, 1, 0, 1, 3]],
];

async function seedViews(tx: Tx): Promise<void> {
  for (const [id, days] of SAMPLE_VIEWS) {
    for (const [i, views] of days.entries()) {
      if (views === 0) continue;
      await tx`
        insert into page_views (subject_type, subject_id, day, views)
        values ('request', ${id}, current_date - ${days.length - 1 - i}::int, ${views})
      `;
    }
  }
}

// The rest of the sample community, so Find shows what a lively board looks
// like: food, seniors and pets. The pantry's need already has a neighborhood
// group's delivery of 12 bags confirmed, so its progress bar is real.
async function seedCommunity(tx: Tx, now: Date, today: string, timezone: string): Promise<void> {
  await tx`
    insert into profiles ${tx([
      { id: DEMO_IDS.ana, displayName: "Ana Ruiz" },
      { id: DEMO_IDS.grace, displayName: "Grace Holt" },
      { id: DEMO_IDS.tom, displayName: "Tom Reyes" },
      { id: DEMO_IDS.leo, displayName: "Leo Park" },
    ])}
  `;
  const org = (id: string, name: string, city: string, about: string, contactName: string, contactEmail: string, createdBy: string) => ({
    id,
    kind: "organization",
    name,
    city,
    about,
    contactName,
    contactEmail,
    contactPhone: "",
    contactConfirmedAt: now,
    contactConfirmedBy: DEMO_IDS.riley,
    inviteToken: newInviteToken(),
    createdBy,
  });
  await tx`
    insert into workspaces ${tx([
      org(DEMO_IDS.pantry, "Westside Food Pantry (sample)", "Kissimmee, FL", "A fictional food pantry used in the demo.", "Ana Ruiz", "ana@westside.example", DEMO_IDS.ana),
      org(DEMO_IDS.seniorHome, "Palm Grove Senior Living (sample)", "Kissimmee, FL", "A fictional senior home used in the demo.", "Grace Holt", "grace@palmgrove.example", DEMO_IDS.grace),
      org(DEMO_IDS.rescue, "Osceola Paws Rescue (sample)", "St. Cloud, FL", "A fictional animal rescue used in the demo.", "Tom Reyes", "tom@osceolapaws.example", DEMO_IDS.tom),
      {
        id: DEMO_IDS.neighbors,
        kind: "group",
        name: "Westside Neighbors (sample)",
        city: "Kissimmee, FL",
        about: "A fictional group of neighbors.",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactConfirmedAt: null,
        contactConfirmedBy: null,
        inviteToken: newInviteToken(),
        createdBy: DEMO_IDS.leo,
      },
    ])}
  `;
  await tx`
    insert into workspace_members ${tx([
      { workspaceId: DEMO_IDS.pantry, userId: DEMO_IDS.ana, role: "admin" },
      { workspaceId: DEMO_IDS.seniorHome, userId: DEMO_IDS.grace, role: "admin" },
      { workspaceId: DEMO_IDS.rescue, userId: DEMO_IDS.tom, role: "admin" },
      { workspaceId: DEMO_IDS.neighbors, userId: DEMO_IDS.leo, role: "admin" },
    ])}
  `;

  const request = (r: {
    id: string;
    orgId: string;
    createdBy: string;
    title: string;
    need: string;
    beneficiaries: string;
    category: string;
    requestType: "kit" | "item";
    unitName: string;
    targetQuantity: number;
    days: number;
    location: string;
    handover: string;
    contact: string;
  }) => ({
    id: r.id,
    orgId: r.orgId,
    title: r.title,
    need: r.need,
    beneficiaries: r.beneficiaries,
    category: r.category,
    requestType: r.requestType,
    unitName: r.unitName,
    targetQuantity: r.targetQuantity,
    conditionNotes: "New or unopened only.",
    substitutions: "",
    neededBy: addDays(today, r.days),
    timezone,
    location: r.location,
    handoverInstructions: r.handover,
    coordinatorContact: r.contact,
    fundraisingUrl: null,
    status: "published",
    submittedAt: now,
    publishedAt: now,
    reviewedBy: DEMO_IDS.riley,
    createdBy: r.createdBy,
  });
  await tx`
    insert into requests ${tx([
      request({
        id: DEMO_IDS.pantryRequest,
        orgId: DEMO_IDS.pantry,
        createdBy: DEMO_IDS.ana,
        title: "Weekend food bags for families",
        need: "Some children get free meals at school but little at home over the weekend. A bag of shelf-stable food covers two days for one family.",
        beneficiaries: "Families with school-age children who use the pantry",
        category: "food",
        requestType: "kit",
        unitName: "bag",
        targetQuantity: 40,
        days: 12,
        location: "Kissimmee, FL",
        handover: "Bring bags to the back door on Thursdays, 4 to 6 pm.",
        contact: "Ana Ruiz, ana@westside.example",
      }),
      request({
        id: DEMO_IDS.seniorRequest,
        orgId: DEMO_IDS.seniorHome,
        createdBy: DEMO_IDS.grace,
        title: "Comfort kits for residents",
        need: "Many of our residents have few visitors. A small kit of comfort items is something new and theirs to keep.",
        beneficiaries: "Residents of our memory care and assisted living wings",
        category: "seniors",
        requestType: "kit",
        unitName: "kit",
        targetQuantity: 30,
        days: 21,
        location: "Kissimmee, FL",
        handover: "Sign in at the front desk, any day 10 am to 4 pm.",
        contact: "Grace Holt, grace@palmgrove.example",
      }),
      request({
        id: DEMO_IDS.rescueRequest,
        orgId: DEMO_IDS.rescue,
        createdBy: DEMO_IDS.tom,
        title: "Dry dog food for dogs waiting for homes",
        need: "We care for about 25 dogs at a time while they wait to be adopted. Food is our biggest monthly cost.",
        beneficiaries: "Dogs in our care until they are adopted",
        category: "pets",
        requestType: "item",
        unitName: "15 lb bag of dry dog food",
        targetQuantity: 25,
        days: 30,
        location: "St. Cloud, FL",
        handover: "Drop off at the kennel office, Saturdays 9 am to noon.",
        contact: "Tom Reyes, tom@osceolapaws.example",
      }),
    ])}
  `;
  const pantryItems = [
    { name: "Can of soup", per: 2, details: "Ready to eat, with a pull-tab lid" },
    { name: "Bag of rice", per: 1, details: "2 lb" },
    { name: "Jar of peanut butter", per: 1, details: "Plastic jar" },
    { name: "Box of cereal", per: 1, details: "Family size" },
  ];
  const pantryComponentIds: string[] = [];
  for (const [position, item] of pantryItems.entries()) {
    const [row] = await tx`
      insert into request_components ${tx({
        requestId: DEMO_IDS.pantryRequest,
        position,
        name: item.name,
        normalizedKey: normalizeItemKey(item.name),
        quantityPerUnit: item.per,
        details: item.details,
      })}
      returning id
    `;
    pantryComponentIds.push(row.id as string);
  }
  await tx`
    insert into request_components ${tx([
      { requestId: DEMO_IDS.seniorRequest, position: 0, name: "Large-print word search book", normalizedKey: normalizeItemKey("Large-print word search book"), quantityPerUnit: 1, details: "" },
      { requestId: DEMO_IDS.seniorRequest, position: 1, name: "Fleece throw blanket", normalizedKey: normalizeItemKey("Fleece throw blanket"), quantityPerUnit: 1, details: "About 50 by 60 inches" },
      { requestId: DEMO_IDS.seniorRequest, position: 2, name: "Pair of non-slip socks", normalizedKey: normalizeItemKey("Pair of non-slip socks"), quantityPerUnit: 1, details: "Adult size" },
      { requestId: DEMO_IDS.seniorRequest, position: 3, name: "Unscented hand lotion", normalizedKey: normalizeItemKey("Unscented hand lotion"), quantityPerUnit: 1, details: "Travel size" },
      { requestId: DEMO_IDS.rescueRequest, position: 0, name: "15 lb bag of dry dog food", normalizedKey: normalizeItemKey("15 lb bag of dry dog food"), quantityPerUnit: 1, details: "Any adult formula" },
    ])}
  `;

  // Westside Neighbors took 20 bags, brought the items for 12, packed them,
  // and the pantry confirmed all 12.
  const confirmedBags = 12;
  await tx`
    insert into commitments ${tx({ id: DEMO_IDS.pantryDrive, requestId: DEMO_IDS.pantryRequest, groupId: DEMO_IDS.neighbors, quantity: 20, createdBy: DEMO_IDS.leo })}
  `;
  for (const [i, componentId] of pantryComponentIds.entries()) {
    await tx`
      insert into collection_entries ${tx({
        commitmentId: DEMO_IDS.pantryDrive,
        componentId,
        pledgeId: null,
        usableQuantity: pantryItems[i].per * confirmedBags,
        unusableQuantity: 0,
        note: "",
        recordedBy: DEMO_IDS.leo,
      })}
    `;
  }
  await tx`
    insert into kit_movements ${tx({ commitmentId: DEMO_IDS.pantryDrive, kind: "packed", quantity: confirmedBags, note: "", createdBy: DEMO_IDS.leo })}
  `;
  await tx`
    insert into deliveries ${tx({
      commitmentId: DEMO_IDS.pantryDrive,
      quantity: confirmedBags,
      note: "Dropped off Thursday at the back door.",
      status: "reviewed",
      submittedBy: DEMO_IDS.leo,
      acceptedQuantity: confirmedBags,
      notAcceptedQuantity: 0,
      reviewNote: "Thank you, these go out Friday.",
      reviewedBy: DEMO_IDS.ana,
      reviewedAt: now,
    })}
  `;
}
