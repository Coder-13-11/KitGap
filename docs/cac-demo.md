# Congressional App Challenge: demo outline and submission checklist

## Check the official rules first

Rules were read only through House office web pages (the official PDF was blocked in the build environment). They said the deadline is **Monday, October 26, 2026 at 12:00 p.m. ET** (one office page said 8 p.m. ET), videos run **1 to 3 minutes** on YouTube or Vimeo, AI use is allowed **only if disclosed**, AI may support only specific parts of the project, and you must be able to explain your contributions and how the code works. Confirm all of this in the official 2026 rules and your district's page before you record or submit. Submissions can't be changed after the deadline.

## Video outline (about 2½ minutes)

Record the demo at `/demo` on the deployed site or locally. Use a browser zoom around 125% so the text is readable, and close other tabs. Speak in your own words; the lines below are prompts, not a script. The sample people and organizations are fictional.

| Time | Screen | What to say and do |
| --- | --- | --- |
| 0:00–0:15 | Home | Who you are and your district. Organizations know the kit they need. Clubs want to help. People rarely learn what was actually confirmed. |
| 0:15–0:35 | Request, as Jordan | School-supply kits. Point at “One kit still needs 1 backpack, 2 notebooks and 1 pencil pack,” then the line that a pledge is not collected. |
| 0:35–0:55 | Sam's drive | Pledge 10 notebooks. Show “10 notebooks are enough for 5 kits” and “Where your items went,” still on “Pledged.” |
| 0:55–1:20 | Jordan's drive | Record Sam's 10 notebooks against the pledge. Pack and report the delivery. The timeline says “Recorded as received,” then “Handed over.” Confirmed is not there yet. |
| 1:20–1:45 | Maya's review | Accept 13, not 15. Message: “Thank you. The pencil packs were missing from 2 kits.” Say the message stays with the group and is not posted publicly. |
| 1:45–2:05 | Sam, then the group record | Sam sees “Confirmed” and how many kits are still to be confirmed. Open Lakeside's confirmed record: 13 kits, “10 kits confirmed,” Riverbend listed, Sam's name absent. |
| 2:05–2:20 | Public drive | “Share this drive” and the sentence “Help finish this drive.” One line on how this differs from a wish list: the group collects and packs, and the organization confirms. KitGap is not the only goods tool. |
| 2:20–2:30 | Your code | Show `requestTotals` or the unit test that a pledge does not count as confirmed. Mention the AI help honestly (see `docs/ai-usage.md`). |

Don't claim partnerships, real deliveries, users or impact that haven't happened. "I tested it with 4 people" is fine only if it's true.

## Submission checklist

- [ ] Read the official 2026 CAC rules and your district's page; confirm the deadline and time zone.
- [ ] Deploy (see `docs/setup.md`), or decide to demo locally and say so.
- [ ] Run the user-testing sessions (`docs/user-testing.md`) and fix what you can.
- [ ] Fill in `docs/ai-usage.md` honestly, and copy the disclosure into the submission form.
- [ ] Make a change of your own to the code that you can explain (ideas below), with a test.
- [ ] Record the video (1–3 minutes), upload it to YouTube or Vimeo (unlisted is usually fine; check the rules).
- [ ] Make sure the code is in a repository the judges can access, if the rules require it.
- [ ] Submit before the deadline.

## Code you should know well enough to explain

These are the parts a judge is most likely to ask about:

1. How availability is calculated: `requestTotals` in `src/domain/quantities.ts` and `docs/quantity-model.md`.
2. Why two groups can't take the same last kits: the `for update` lock in `loadRequestState` (`src/server/services/core.ts`) and the concurrency test in `tests/integration/drives.test.ts`. Try removing the lock and run the test to see it fail.
3. How a retry doesn't create a duplicate: `mutate` and the idempotency key in `core.ts`.
4. How the demo stays separate from real data: `src/server/demo/sandbox.ts`, `src/proxy.ts` and `inSchema` in `src/server/db/client.ts`.
5. How private details stay private: `getRequestDetail` in `src/server/queries/requests.ts` and the privacy test in `tests/integration/access.test.ts`.

## Ideas for changes to make yourself

Pick one or two, do them without AI writing the code, and be ready to explain them:

- Add a new request category (for example "Cleaning supplies"): `CATEGORIES` and `CATEGORY_LABEL` in `src/domain/`, plus the database `check` constraint in a new migration.
- Show "X days left" in a different color when fewer than 3 days remain, using `describeDeadline`.
- Add a unit test for a new quantity scenario in `tests/unit/quantities.test.ts`, for example a 3-item recipe where two items are short.
- Change wording you found confusing in user testing.
