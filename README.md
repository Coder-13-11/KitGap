# KitGap

**Turn a community need into a drive your group can complete.**

KitGap connects a specific material need with the groups willing to meet it. An organization (a school, shelter or family center) posts exactly what it needs, for example 100 school-supply kits, each with a backpack, two notebooks and a pencil pack. School clubs and community groups adopt part of it. Members pledge items; the coordinator records what actually arrives, packs complete kits and hands them over. The receiving organization confirms what it received, and only that counts as fulfilled.

Built for the 2026 Congressional App Challenge. See [docs/ai-usage.md](docs/ai-usage.md) for how AI was used.

![Request page](docs/screenshots/request-1440.jpg)

## What works

- Public request directory with search, category, status and sort; request pages showing the exact recipe, live availability and progress.
- Organizations: register, write requests in a four-step form (drafts saved, recipe preview, duplicate checks), submit for review, review deliveries (accept all, or part with a reason), close, reopen, cancel, copy, post updates, invite staff.
- KitGap reviewers: confirm an organization's contact, then approve or return requests. Reviewer access is granted only with SQL.
- Groups: start a drive for a chosen quantity (checked against live availability), invite members, record received supplies (usable or not, from a pledge or not), pack kits, report deliveries, fix or set aside kits that weren't accepted, change the quantity, withdraw.
- Contributors: join with an invitation link, pledge, withdraw a pledge.
- Plain-language guidance ("10 more notebooks complete the remaining 20 kits"), a printable packing sheet, CSV export, a public share page with totals only, and in-app updates.
- Email-and-password accounts with confirmation, password reset and expired-session handling (Supabase Auth).
- **Try the demo:** a private sandbox per visitor with sample data, four sample people and a reset.

## Run it locally

```bash
npm install
npm run db:start       # local Supabase in Docker
cp .env.example .env.local   # then fill it in, see docs/setup.md
npm run db:migrate
npm run dev            # http://localhost:3000, demo at /demo
```

Full instructions, including deployment to Supabase and Vercel, are in [docs/setup.md](docs/setup.md).

## Checks

```bash
npm run typecheck && npm run lint && npm test   # 71 unit and integration tests
npm run test:e2e                                # browser and accessibility tests
```

## Documentation

| Document | Contents |
| --- | --- |
| [docs/setup.md](docs/setup.md) | Local setup, environment variables, deployment, auth and email settings |
| [docs/quantity-model.md](docs/quantity-model.md) | How every number is calculated, the invariants, concurrency and retries |
| [docs/architecture.md](docs/architecture.md) | Requests and drives, code map, permissions, what's public, the demo sandbox, code to know |
| [docs/testing.md](docs/testing.md) | Test results and how each acceptance test is covered |
| [docs/accessibility.md](docs/accessibility.md) | What was checked and what still needs manual testing |
| [docs/research.md](docs/research.md) | UX research note and the design decisions it informed |
| [docs/user-testing.md](docs/user-testing.md) | Task sheet for testing with real people |
| [docs/limitations.md](docs/limitations.md) | What doesn't exist or hasn't been verified |
| [docs/cac-demo.md](docs/cac-demo.md) | Demo video outline and submission checklist |
| [docs/ai-usage.md](docs/ai-usage.md) | AI usage and credits (to be completed by the student) |
| [docs/screenshots/](docs/screenshots/) | Screenshots of the main screens |

## Stack

Next.js 16 (App Router) and React 19, TypeScript, Tailwind CSS 4, Supabase Auth and Postgres (accessed from the server with postgres.js), Vitest, Playwright and axe-core.
