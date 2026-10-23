# Handoff: context for the next coding assistant

Read this first, then `docs/architecture.md` and `docs/quantity-model.md`. It describes the state of the project at the end of the first build (October 23, 2026) and the rules any further work has to keep.

## What KitGap is

A web app for the 2026 Congressional App Challenge (Florida's 15th district; submissions close Monday, October 26, 2026 at 12:00 p.m. ET; confirm in the official rules). Tagline: "Turn a community need into a drive your group can complete."

- An **organization** (a food pantry, school office, shelter) posts a **request**: either kits made from a recipe (for example 1 backpack + 2 notebooks + 1 pencil pack per kit) or a single item.
- A platform **reviewer** checks the organization's contact and publishes the request.
- A **group** (a school club, scout troop, team) **adopts** part of it, for example 20 of 100 kits. That is a **drive**, led by a **coordinator**.
- **Contributors** in the group **pledge** items. The coordinator **records** what actually arrived, **packs** kits and **submits a delivery**.
- The organization **reviews** the delivery: accepts some or all and explains anything not accepted.

There is no payment handling. A request can show a link to the organization's own fundraising page; it is labelled as external and never counts as goods.

## Stack

- Next.js 16 (App Router, `src/proxy.ts` instead of middleware, server actions, `cacheComponents: false`), React 19, TypeScript, Tailwind CSS v4 (tokens in `src/app/globals.css`), lucide-react icons.
- **This Next.js version differs from older training data.** Read the guide in `node_modules/next/dist/docs/` before changing routing, caching, params or actions (see `AGENTS.md`).
- Supabase Auth through `@supabase/ssr`. Use `getUser()` for any authorization decision.
- Postgres accessed directly from the server with postgres.js (`src/server/db/client.ts`). Tables live in the `kitgap` schema, which the Supabase Data API does not expose. Row-level security is on with no policies, and the browser roles have no grants. **All authorization is in `src/server/services`.**
- Tests: Vitest (unit and integration against a real Postgres), Playwright and axe-core for end-to-end and accessibility.

## Commands

| Command | Does |
| --- | --- |
| `npm install` | Install dependencies (Node 20.9 or newer) |
| `npm run db:migrate` | Apply `db/migrations/*.sql` to the database in `DATABASE_URL` |
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run check` | Typecheck, lint, and unit + integration tests |
| `npm run db:start` / `db:stop` | Local Supabase in Docker (needed for integration and browser tests) |
| `npm run test:e2e` | Browser tests; needs the local stack and the app running |
| `npm run db:make-reviewer -- you@example.com` | Give an account reviewer access |
| `npm run demo:cleanup` | Remove old demo sandboxes |

Environment variables are listed in `.env.example`. `.env.local` is never committed. `DEMO_COOKIE_SECRET` must be at least 32 characters. Against hosted Supabase, use the **Session pooler** connection string, not the direct `db.<project>.supabase.co` address (that one usually needs IPv6).

## Where things are

| Path | Contents |
| --- | --- |
| `src/domain/` | Pure logic shared by client and server: quantity math (`quantities.ts`), guidance wording (`guidance.ts`), phases, dates, request-form validation. No database access. |
| `src/server/services/` | Every change to data. Each runs through `mutate()` in `core.ts`. |
| `src/server/queries/` | Read-only page data, including privacy filtering. |
| `src/server/demo/sandbox.ts` | The demo: one Postgres schema per visitor, seeded with fictional data. |
| `src/server/next/` | Request context (live user or demo persona), Supabase client, action wrapper. |
| `src/actions/` | Server actions called by forms. They parse input and call services. |
| `src/app/` | Pages. `src/components/` holds UI building blocks (`ui/action-form.tsx` is the standard form). |
| `db/migrations/` | SQL migrations, written without a schema prefix so they apply to `kitgap` and to every demo schema. |
| `tests/unit`, `tests/integration`, `tests/e2e` | Tests (see `docs/testing.md`). |

## Rules that must keep holding

These are tested. Breaking one is a bug, even when the screen looks right.

1. **Quantities** (details in `docs/quantity-model.md`):
   - `available to adopt = max(0, target − accepted − reserved)`.
   - Withdrawing a drive releases only the part not yet submitted. Kits in a delivery awaiting review stay reserved.
   - A pledge never counts as collected.
   - Complete kits = the minimum over items of `floor(usable collected ÷ quantity per kit)`.
   - Kit stages (packed, set aside, delivered, accepted) are disjoint: no kit is counted twice.
   - Partial acceptance, rejection, correction and retries never inflate the accepted total.
2. **Every write goes through `mutate()`.** It opens a transaction, applies the idempotency key, locks the request row (`loadRequestState(..., { lock: true })`), validates, writes, then runs `assertInvariants`. Don't write to the database from an action, page or route directly.
3. **Authorization is checked in the service**, with `requireRole` / `requirePlatformAdmin`. A group can't review its own delivery. A person who submitted a delivery can't review it.
4. **Privacy:** public pages never show contact details, handover details or contributors' names. `getRequestDetail` gates these; `tests/integration/access.test.ts` checks them.
5. **The demo can't touch real data.** Demo requests reach `src/proxy.ts` under `/demo/*`, which rewrites them and sets `x-kitgap-demo`; the header is stripped from every other request. `inSchema` pins each transaction to one schema.
6. **Schema changes:** add a new numbered file in `db/migrations/` (never edit an applied one, because checksums are verified), run `npm run bundle-migrations` (it also runs automatically before dev, build and test), then `npm run db:migrate`. Old demo sandboxes migrate themselves when next opened.
7. **Forms** use `ActionForm`. It handles the idempotency key, disables the form while saving, shows field errors and a focused error summary, and keeps entries after an error.
8. **Honesty:** don't add made-up users, partners, testimonials, statistics or impact claims anywhere, including the demo. The demo's people and organizations are marked fictional.
9. **Accessibility:** WCAG 2.2 AA is the target. Visible labels, keyboard access, visible focus, links in text underlined, no color-only meaning, layouts that work at 320 px.

## Status at handoff

- Built: every flow above, plus the reviewer queue, organization updates, an in-app **Updates** page with an unread count, an invitation link per group, a drive's packing sheet and CSV export, copy and edit rules for requests, and account pages.
- Verified in the build environment: 71 unit and integration tests, 6 browser tests on the production build, 0 axe violations on 17 screens, a clean typecheck, lint and build. Layouts were checked in Chromium at 320, 390, 768 and 1440 px (screenshots in `docs/screenshots/`).
- **Not done or not verified:** testing with real users, screen readers, real phones and other browsers; deployment; production email (SMTP). See `docs/limitations.md`.
- `docs/ai-usage.md` is an incomplete template the student must fill in honestly, and it must also list any tools used after this handoff.

## Before you finish a change

1. Run `npm run check`. If you changed a flow on screen, also run `npm run test:e2e` with the local stack running.
2. Add or update a test for any change to quantities, permissions or privacy.
3. Check the screen at 390 px and 1440 px.
4. Update the relevant file in `docs/` if behavior changed.
