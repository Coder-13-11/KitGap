# AI usage and credits

> **This document is incomplete until the student fills it in.** The sections marked *To fill in* must describe what you actually did. Don't submit it with placeholder text, and don't overstate or understate either side's role.

## Tools

| Tool | Version or model | Used for |
| --- | --- | --- |
| Claude Code (Anthropic), with a Claude model | *To fill in: the model name shown in your Claude Code session* | Research summaries, architecture and data model, most of the code, tests, documentation and screenshots in the first build (October 23, 2026) |
| *To fill in: any other AI tools* | | |

## What the AI assistant did in the first build

From the build session that started on October 23, 2026. The student provided a detailed written brief (product purpose, scope, quantity rules, design direction and acceptance tests), and the assistant worked from it:

- Searched for background (the primary websites were blocked) and wrote `docs/research.md`.
- Chose the stack (Next.js, Supabase, Postgres) and designed the data model and quantity ledger.
- Wrote the application code in `src/`, the database migrations, the demo sandbox, and the scripts.
- Wrote the unit, integration, browser and accessibility tests, ran them, and fixed the bugs they found.
- Reviewed screenshots at several screen widths and fixed layout problems.
- Wrote the documentation in `docs/` and the README.

## What the student did

*To fill in.* Be specific. For example:

- Wrote the product brief: the problem, the users, the rules for counting kits, and the acceptance tests.
- Decisions you made or changed (for example: requiring a contact check before publishing, or the wording of statuses).
- Code you wrote or changed yourself, with file names.
- Testing you did, and with whom (from `docs/user-testing.md`).
- Bugs you found and how they were fixed.
- What you would do next.

## What the student can explain

*To fill in.* List the parts of the code you can explain without notes. See "Code you should know well enough to explain" in `docs/cac-demo.md`.

## Third-party software and assets

Next.js, React, TypeScript, Tailwind CSS, Supabase (Auth and Postgres), postgres.js, Lucide icons (ISC license), Public Sans and Source Serif 4 (SIL Open Font License), Playwright, Vitest, axe-core. All sample organizations, groups and people in the demo are fictional. No stock photos are used.
