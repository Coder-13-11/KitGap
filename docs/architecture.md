# How KitGap is built

## Requests and drives

- An **organization** posts a **request**: a target quantity of one kind of kit (with a recipe) or one kind of item.
- A KitGap **reviewer** confirms the organization's contact and approves the request. Only then is it public.
- A **group** (school club, community group) adopts part of it. That creates a **commitment**, which the interface calls a **drive**. One request can have many drives; a group has at most one active drive per request.
- Inside the drive, members **pledge** items, the coordinator records what **arrived**, **packs** kits, and reports **deliveries**.
- The organization **reviews** each delivery once: everything accepted, or part accepted with an explanation.

```
Organization ─┬─ Request ─┬─ Recipe (components)
              │           └─ Drive (commitment) ── Group
              │                 ├─ Pledges (members)
              │                 ├─ Collection entries (coordinator)
              │                 ├─ Kit movements (coordinator)
              │                 └─ Deliveries ── Review (organization)
              └─ Members (managers, staff)
```

Accounts aren't tied to one role. The same person can manage an organization and coordinate or join groups.

## Code map

| Folder | What's there |
| --- | --- |
| `src/domain/` | Pure TypeScript with no database: quantity math (`quantities.ts`), request form validation (`request-input.ts`), statuses (`phase.ts`), dates (`dates.ts`), plain-language guidance (`guidance.ts`). Runs in the browser and on the server. |
| `src/server/services/` | Every change. Each function opens a transaction, locks the request, checks permissions and rules, writes records, logs activity, and re-checks the invariants. |
| `src/server/queries/` | Read models for each page. They decide, field by field, what each viewer may see. |
| `src/server/db/` | Database connection, schema switching (real data or a demo sandbox), migrations. |
| `src/server/demo/` | The demo sandbox: create, seed, reset, clean up, cookie signing. |
| `src/server/next/` | Glue for Next.js: who is signed in (`context.ts`), Supabase Auth client, turning errors into form messages (`action.ts`). |
| `src/actions/` | Server actions called by forms. Thin: read the form, call a service. |
| `src/app/` | Pages (Next.js App Router). |
| `src/components/` | Interface components. `ui/` is the small shared kit (buttons, fields, notices, dialog, progress). |
| `db/migrations/` | SQL schema. Bundled into `src/server/db/migrations-bundle.ts` before dev, build and test. |
| `tests/` | `unit/` (domain), `integration/` (services against Postgres), `e2e/` (browser). |

## Who can do what

Authorization is enforced in server code, in the services, close to the data. The checks run on every call, including direct requests that skip the interface.

| Action | Who | Where it's checked |
| --- | --- | --- |
| Create, edit and submit requests | Members of the organization | `requests.ts` → `requireRole(…, "member")` |
| Close, reopen, cancel, safe edits, move back to draft | Organization managers | `requireRole(…, "admin")` |
| Approve or return requests; confirm an organization's contact | KitGap reviewers (the `platform_admins` table, set with SQL only) | `requirePlatformAdmin` |
| Start a drive for a group | That group's coordinators | `adoptRequest` |
| Pledge | Members of the drive's group | `createPledge` |
| Withdraw a pledge | Its owner; coordinators can close unfulfilled ones | `closePledge` |
| Record received items, pack, report deliveries, change quantity, withdraw | The drive's coordinators | `requireRole(group, "admin")` |
| Accept or not accept a delivery | Members of the receiving organization, but not the person who reported it | `reviewDelivery` |

Nothing in the interface can grant reviewer access. A "role switcher" exists only in the demo, and only inside that visitor's sandbox.

### The database is not exposed to browsers

KitGap's tables live in a `kitgap` schema that isn't part of Supabase's browser Data API. Row-level security is enabled on every table with no policies, and the `anon` and `authenticated` roles have no privileges on the schema. Even with the public Supabase key, a browser can read or change nothing directly. An integration test checks this ("gives the Supabase API roles no access to KitGap tables").

This is a deliberate choice over writing row-level-security policies for each table. The quantity rules need transactions and row locks that the browser API can't provide, so every read and write goes through the server anyway, and one set of permission checks in TypeScript is easier to review and explain.

### What's public

| Shown publicly | Never public |
| --- | --- |
| Published requests: title, need, who it helps (in general terms), recipe, quantities, needed-by date, general location, organization and group names, totals | Drafts and requests under review |
| Whether an organization's contact was confirmed | Organization contact details (reviewers and members only) |
| A drive's totals and still-needed list (the share link) | Contributors' names, pledges and notes (the drive's coordinators only) |
| Organization updates | Handover instructions and coordinator contact (the organization, reviewers, and groups with an active drive) |
| | Invitation links, emails (stay in Supabase Auth) |

`tests/integration/access.test.ts` serializes every public read model and checks that none of these private values appear.

## The demo sandbox

- **Try the demo** creates a private Postgres schema for the visitor, named `kgdemo_<random id>`. It's built from the same migrations as the real schema and seeded with fictional sample data.
- A signed cookie holds the sandbox id; a second cookie holds which sample person they're acting as.
- URLs under `/demo/…` are served by the normal pages: `src/proxy.ts` adds a header that tells the server to use the sandbox. Every database transaction sets `search_path` to exactly one schema, so a sandbox transaction cannot name a real table.
- Reset rebuilds the schema. Sandboxes unused for a day are dropped, with a cap of 300.
- The demo runs the real services, rules and locks. It doesn't use real sign-in.

## Central code paths to read and be able to explain

1. `src/domain/quantities.ts`: `requestTotals`, `commitmentLedger`, `driveProgress`. Why withdrawal releases only `q − accepted − pending`.
2. `src/server/services/core.ts`: `mutate` (transaction plus idempotency key), `loadRequestState` (`for update` lock), `assertInvariants`.
3. `src/server/services/drives.ts`: `adoptRequest`, from top to bottom.
4. `src/server/services/supplies.ts`: `reviewDelivery`. Why a delivery can be decided only once.
5. `src/server/queries/requests.ts`: `getRequestDetail`. How private fields are kept out of public pages.
6. `src/server/demo/sandbox.ts` and `src/proxy.ts`: how the demo is isolated.

## One failure case, tested

**Two coordinators try to adopt the last 10 kits at the same moment.** Both requests arrive while 10 are available. Each runs `adoptRequest` in its own transaction. The first locks the request row and inserts its commitment. The second waits on the lock. When the first commits, the second reads the new totals: 0 available. It rolls back with "Other groups have now promised all 100 kits", and its coordinator sees that message with the available count. Test: `tests/integration/drives.test.ts`, "lets only one of two simultaneous adoptions of the last 10 kits succeed". Removing the lock makes this test fail.
