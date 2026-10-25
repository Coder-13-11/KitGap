# Congressional App Challenge: demo outline and submission checklist

## Check the official rules first

Rules were read only through House office web pages (the official PDF was blocked in the build environment). They said the deadline is **Monday, October 26, 2026 at 12:00 p.m. ET** (one office page said 8 p.m. ET), videos run **1 to 3 minutes** on YouTube or Vimeo, AI use is allowed **only if disclosed**, AI may support only specific parts of the project, and you must be able to explain your contributions and how the code works. Confirm all of this in the official 2026 rules and your district's page before you record or submit. Submissions can't be changed after the deadline.

## Video outline (about 2½ minutes)

Record the demo at `/demo` on the deployed site or locally. Use a browser zoom around 125% so the text is readable, and close other tabs. Speak in your own words; the lines below are prompts, not a script. Every place and person in the demo is made up, and the names say "(sample)".

The story: **a local place posts exactly what it needs, people help, and only what the place confirms counts.**

| Time | Screen | What to say and do |
| --- | --- | --- |
| 0:00–0:15 | Home page | Who you are and your district. Why you built it, in one sentence of your own (for example, a drive you saw that collected the wrong things). |
| 0:15–0:40 | Find, in the demo | The sample town: a food pantry, a senior home, an animal rescue and a school. Tap the Food icon. Open "Weekend food bags": 40 bags, exactly what goes in each, and a bar where only the 12 bags the pantry confirmed count as done. |
| 0:40–0:55 | Share kit on that need | Show the square post image with the QR code and "Copy caption". One line: people already use Instagram and group chats, so KitGap makes a post for them. |
| 0:55–1:25 | The guided tour (school kits) | As Jordan, offer to help with 20 kits. As Sam, pledge 10 notebooks; the page says a pledge isn't counted yet. As Jordan, record what arrived, pack 15 kits and report the handover. |
| 1:25–1:50 | Maya's review | Accept 13 of 15 with a note: "The pencil packs were missing from 2 kits." Say the note goes to the group, not the public. |
| 1:50–2:10 | Confirmed | Sam sees "Confirmed". Open the group's confirmed record: 13 kits, the family center listed, no personal names. Show the phone layout or the installed app for a few seconds. |
| 2:10–2:30 | Your code | Show `requestTotals` or the unit test that a pledge doesn't count as confirmed. Mention the AI help honestly (see `docs/ai-usage.md`). |

Don't claim partnerships, real deliveries, users or impact that haven't happened. "I tested it with 4 people" is fine only if it's true.

## Questions a judge may ask

Short, honest answers. Put them in your own words.

- **Isn't this just a wish list or a sign-up sheet?** A wish list stops at "someone said they'd bring it". KitGap tracks what actually arrived and only counts what the receiving place confirmed. It also checks that two groups can't take the same part of a need.
- **Who would use it first?** A local food pantry, shelter, school or senior home with a specific need, and the neighbors and clubs who want to help. School clubs can also run their own drive with a receipt link.
- **Why would a busy organization bother?** Posting a need takes a few minutes, and they get exactly what they listed instead of random donations. Reviewing a handover is one screen.
- **How do you stop fake organizations?** A KitGap reviewer confirms each organization's contact before its needs go public. Needs show "Contact confirmed" when that happened.
- **What about privacy?** Public pages show totals only. Helpers' names, notes and drop-off details are visible only to the people running the drive and the organization. The view counter stores a number per day, nothing about the visitor.
- **What happens if two people take the last bags at the same time?** The database locks the need while a change is saved, so the second person gets a clear message instead of a double count. There's an automated test for exactly this.
- **What would you build next?** Photo proof of drop-offs, a pledge link that doesn't need an account, and volunteer-hours certificates for students. All are listed in `docs/repurpose-plan.md`.
- **What did AI do, and what did you do?** Answer from `docs/ai-usage.md`, and point to the change you made yourself.

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
