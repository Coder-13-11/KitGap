# Testing

## What runs, and the latest results

Latest full run: **October 25, 2026**, against the hosted Supabase database (each integration test file makes its own throwaway schema and drops it; none touches the live `kitgap` schema).

| Suite | Command | What it covers | Result (Oct 25, 2026) |
| --- | --- | --- | --- |
| Unit | `npx vitest run tests/unit` | Quantity math, validation, dates, wording, migrations bundle, onboarding, Kit's advice, drafts and number guardrail | **104 passed** |
| Integration | `npx vitest run tests/integration` | Services against real Postgres: permissions, concurrency, retries, privacy, club drives, imports, webhooks, the demo board, Kit's daily AI caps | **52 passed**, 6 skipped (below) |
| Accessibility (browser) | `npx playwright test tests/e2e/accessibility.spec.ts` | axe-core WCAG A and AA on public and demo screens, on the production build | **2 passed** |
| Demo walkthrough (browser) | `npx playwright test tests/e2e/demo-walkthrough.spec.ts` | The whole drive, as four people | **Not passing from a laptop**: saves to the hosted database took over 20 seconds; two runs between them reached every step but the last |
| Sign-up and invites (browser) | `live-auth.spec.ts`, `invite.spec.ts` | Real accounts and email | **Not run**: they create real accounts |
| Types, lint, build | `npm run typecheck`, `npm run lint`, `npm run build` | | clean, build succeeds |

**The 6 skipped tests** (`tests/integration/demo-sandbox.test.ts`) migrate and read the real `kitgap` schema to prove the demo can't reach it. They run only with a separate test database (`TEST_DATABASE_URL`) or with `KITGAP_TEST_LIVE_SCHEMA=1`, so `npm test` can never change production by accident.

A few checks prove a test can actually fail:

- With the request-row lock removed from `loadRequestState`, the concurrency test fails: both simultaneous adoptions succeeded.
- An incorrect expectation in the set-aside test failed until we confirmed that the code was right (a set-aside kit needs all of its items replaced) and fixed the expectation.

## The brief's acceptance tests

| # | Requirement | Where it's verified |
| --- | --- | --- |
| 1 | An organization publishes a valid request; a draft isn't publicly readable | `access.test.ts` "keeps drafts and requests under review out of public view…"; e2e `live-auth` (a request under review returns "not found" to a visitor) |
| 2 | Adopting 20 of 100 kits → 20 / 40 / 20 supplies, 80 available | `drives.test.ts` "adopting 20 of 100 kits…"; unit `supply list`; e2e `demo-walkthrough` step 1 |
| 3 | State survives reloads and other sessions | `drives.test.ts` reads through a second database connection; e2e `live-auth` (the organization's separate browser session sees the coordinator's 20 promised) |
| 4 | Two simultaneous adoptions of the last 10 can't both reserve 10 | `drives.test.ts` "lets only one of two simultaneous adoptions…" (fails without the lock) |
| 5 | A duplicate submit or retry creates one commitment | `drives.test.ts` "creates one drive when the same submission is sent twice, even at the same moment"; `supplies.test.ts` delivery retry; buttons disable while saving |
| 6 | The acceptance and withdrawal example gives exact totals | unit "follows the adopt / accept / withdraw example exactly"; `drives.test.ts` "follows the brief's example…" |
| 7 | A pledge doesn't increase collected; a partial collection leaves only the rest outstanding | unit `pledges and collection`; `supplies.test.ts` "a pledge does not count as collected…"; e2e step 2 |
| 8 | 20 / 30 / 20 collected with a 1:2:1 recipe supports 15 kits | unit `kit math`; `supplies.test.ts` "…support exactly 15 kits"; e2e step 3 |
| 9 | Packing and delivery never count anything twice | unit "moves kits between disjoint stages…"; `supplies.test.ts` "moves kits through disjoint stages…" |
| 10 | Partial receipt, rejection, correction and retry don't inflate accepted | `supplies.test.ts` "partial receipt, rejection, correction and retry never inflate accepted totals"; e2e steps 4–5 |
| 11 | A group can't accept its own delivery or change another group's records through direct calls | `access.test.ts` "a group cannot accept its own delivery or touch another group's drive" |
| 12 | Invalid quantities, unavailable quantities, deadlines and unsafe links are rejected on the server | `drives.test.ts` "rejects invalid and unavailable quantities…", "blocks new drives after… the needed-by date"; `access.test.ts` "validates requests on the server…"; unit `request form validation`; e2e (javascript: link rejected in the form) |
| 13 | Public pages don't disclose private data | `access.test.ts` "never include private contacts, handover details or contributor identities" |
| 14 | The demo can't change real data or another visitor's sandbox | `demo-sandbox.test.ts` (all five tests) |
| 15 | Sign-in return navigation, failed saves, session expiry, keyboard use | e2e `live-auth`: visitor → sign-up → email confirmation → back to the adopt page with the chosen quantity; when the session expires mid-form, the pledge form says so, offers sign-in in a new tab and keeps the entry; an expired session on page load leads to sign-in with "Your session expired"; keyboard-only sign-in with focus moved to the error summary. e2e `invite`: a signed-out contributor opens an invitation, signs up, confirms, returns to the invitation, joins and pledges. e2e `demo-walkthrough`: a review saved without an explanation is refused and the entered number is kept |
| 16 | Withdrawing during a pending delivery releases only the unsubmitted part | unit "keeps a pending delivery reserved after its group withdraws…"; `drives.test.ts` "keeps a delivery awaiting review reserved after withdrawal…" |

## Not covered by automated tests

- The request form's own recovery after an expired session (its answers are kept in the browser tab and offered back after signing in again). Check this by hand: start a request, delete the `sb-…-auth-token` cookies in the browser's developer tools, press **Save and continue**, sign in again, and choose **Restore answers**.
- Real email delivery through a production SMTP provider. Locally, emails go to the Mailpit catcher.
- Browsers other than Chromium; real phones and tablets (layouts were checked in Chromium at 320, 390, 768 and 1440 px).
- Screen readers. See `docs/accessibility.md`.
- Load: many organizations or very large drives at once.
- The demo's concurrency under many simultaneous visitors on a hosted database.

## Running the browser tests

The browser tests need the local Supabase stack (`npm run db:start`) and the app running at http://localhost:3000. To test the production build, run `npm run build && npm start` first. In this development environment Chromium was preinstalled, so the tests ran with `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`. On your computer, run `npx playwright install chromium` once and leave that variable unset.
