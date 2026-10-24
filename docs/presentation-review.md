# Presentation review: making judges believe KitGap

Written October 24, 2026, the day before the demo recording. It covers what the research says about how a judge forms an opinion, what was changed in the app because of it, and what only you can do before Sunday.

## 1. How a judge decides in the first minute

| Finding | Source | What it means for KitGap |
| --- | --- | --- |
| CAC judges score the **quality of the idea**, its **implementation** (including user experience and design) and **programming skill**, mostly from a demo video of 3 minutes or less plus short answers. Newer district rubrics add *impact*, *code* and *user interface*, and ask for a GitHub link. | [CAC rubric 2018](https://www.congressionalappchallenge.us/wp-content/uploads/2018/10/CAC_Rubric_2018.pdf), [House webinar 2023](https://adamsmith.house.gov/sites/evo-subsites/adamsmith.house.gov/files/2023-12/App-Challenge-Webinar-ppt_2023.pdf), [CAC judges page](https://www.congressionalappchallenge.us/get-involved/judges/) | The video has to show the idea, a polished interface *and* real code in under three minutes. |
| People form a stable impression of a page in about **50 ms**, and it carries over to how usable and credible they think it is (a halo effect). | Lindgaard et al., 2006, *Behaviour & Information Technology*, summarized [here](https://www.websiteoptimization.com/?p=2578) | The first screen of the video decides the tone. It needs one clear sentence and one moving thing. |
| In Stanford's credibility studies of more than 2,600 people, **46.1%** cited the look of the site. The top guidelines are *make it easy to verify your claims* and *show there's a real organization behind the site*. Typos, broken links and stale content hurt the most. | [Stanford Web Credibility guidelines](https://credibility.stanford.edu/guidelines) | Cite sources, link to the code, and never show a broken link or a stale number. |
| People give more when they know **specifically** what a gift does. | Cryder, Loewenstein & Scheines, 2013 (in `docs/research.md`) | Name the exact items and who receives them. |
| Motivation rises as a goal gets close (the **goal-gradient** effect). In a café study, a 12-stamp card with 2 stamps already filled was finished faster (median 10 vs 15 days) than a plain 10-stamp card. | [Kivetz, Urminsky & Zheng, 2006](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf) | Show progress toward "done" and make each finished step visible. |
| A single **concrete story** moves people more than statistics, and explaining that effect to people reduces their giving. | [Small, Loewenstein & Slovic, 2007](https://faculty.wharton.upenn.edu/wp-content/uploads/2012/04/Sympathy_and_callousness.pdf) | Tell the story of *one* kit, not "100 kits". Don't lecture. |
| **Fake or AI-written testimonials are illegal** in the US since October 2024 (FTC rule, 16 CFR Part 465), with penalties up to about $52,000 per violation. | [FTC final rule coverage](https://searchengineland.com/ftc-fake-reviews-testimonials-445209) | No invented quotes, ever. Collect real ones (section 4). |
| Newtown, Connecticut received **over 63,000 teddy bears** after the 2012 shooting, plus more than a quarter-million cards, letters and gifts that filled a warehouse. | [NPR, February 2013](https://www.npr.org/transcripts/172608018) | A real, verifiable story of the exact problem KitGap solves: generosity with no list. |

## 2. What changed in the app

**Home page, rebuilt around one story.**
- **Hero:** a short promise, the "Try the two-minute demo" button, and three trust lines: every request is checked by a person, goods only and never money, and no names on public pages.
- **"One kit, from list to doorstep":** an animated tag with real product photos plays when it scrolls into view. Sam pledges (*Promised* ticks to 1), Jordan checks the item in (*Received* ticks to 1), Jordan hands it over (still 0 confirmed), then Riverbend confirms. At that moment the hole fills and the stamp comes down. It teaches the product's one rule in about 8 seconds and ends on a satisfying peak. It can be replayed or stepped through, and it respects reduced motion.
- **The problem:** FEMA and National VOAD guidance plus the NPR-sourced Newtown figure, each linked.
- **"Three numbers, and only one means done":** promised, received, confirmed.
- **Three entry points:** organization, club, and "I was sent a link". Contributors had no way in before.
- **"Built to be checked"** replaces testimonials with facts anyone can verify: four rules enforced in code, each naming the file or test that proves it, and the test count (141: 85 unit, 50 database, 6 browser). A "Read the code" button appears once `REPO_URL` is set in `src/content/credibility.ts`.
- **"From people who tried it":** a section that renders only when `FIELD_NOTES` has real entries. It is empty now, so it's hidden.
- **Closing:** a "Watch one drive go from list to confirmed" band that leads into the demo.
- **Removed:** the duplicated example card and the photo collage, which used about 1.5 screens to say nothing.

**Guided demo tour.** The demo bar is now one row: about 53 px on a phone, down from about 300 px.
- It shows "3/6 · Check in what arrived · as Jordan" and a **Go as Jordan** button that switches to the right sample person and opens the right page.
- Each step ticks off only when it really happened in the visitor's sandbox (`src/server/queries/demo-guide.ts`). Tour progress is the goal-gradient effect applied to a judge clicking through on their own.
- The tour ends on a "Confirmed" stamp. "All steps" holds the full checklist, the person switcher, Start over and Exit.
- I tested the whole tour in the browser: start a drive, pledge, check in, pack, deliver, confirm.

**Focus.**
- The main navigation is now Requests, How it works and Try the demo.
- Discover and Count moved to an "Experiments" footer group. Both pages lost the off-brand dark gradient, pill chips and icon tile, and say plainly that they are experiments.

**Polish.**
- **Page transitions:** pages slide gently between each other (React `<ViewTransition>`), and new animations were added for the stamp, numbers and steps. All of them respect reduced motion.
- **Buttons:** the tag "hole" now shows only on primary buttons, and never next to an icon.
- **Copy:** the repeated "still to be confirmed" line on the request page is gone, the "pencil packs is the limit" grammar is fixed, the uppercase kicker on the drive dashboard is gone, and the About page credits now name the right fonts and the photographers.

## 3. Honest scorecard

| Criterion | Before today | Now | What gets it to 9+ |
| --- | --- | --- | --- |
| Problem and impact | 7 | 8 | One real organization saying "we'd use this", even an email (section 4) |
| Technical quality | 9 | 9 | Public repo link; a clean, green run of the full integration suite |
| Design and UX | 5.5 | 8 | Shorter drive page (still long on phones) |
| Originality | 6.5 | 7.5 | Say the "only confirmed counts" rule out loud in the video |
| Presentation readiness | 3 | 7 | Your AI-use disclosure, your own code change, real field notes, the video |

These are my estimates, not a guarantee. The last column is mostly work only you can do.

## 4. Testimonials: how to get real ones by Sunday

Judges trust a single real sentence from a real person more than any polished page, and a fake one would end the project. In the next 24 hours:

1. **Run three to five 15-minute sessions** with `docs/user-testing.md`: a club member, a teacher or school-office staff member, and a parent. Phone is fine.
2. **Ask at the end:** "In one sentence, what would you tell someone about this?" Write it down word for word.
3. **Ask permission:** "May I quote that, with your first name and role, in my app and video?" For anyone under 18, use a role only ("11th-grade club member") and get a parent's okay.
4. **Add it** to `FIELD_NOTES` in `src/content/credibility.ts` with what they did and the date. The section appears by itself.
5. **Strongest of all:** email one real food pantry, school front office or shelter. Ask whether a tool like this would help, and whether you may quote the reply. One real "yes, we'd use this" from an organization is worth more than ten peer quotes.

Don't edit a quote into praise, and don't ask AI to "improve" it.

## 5. Video script (about 2:45)

Record at `/demo`, browser zoom about 125%, one tab. Say it in your own words.

| Time | Screen | Say |
| --- | --- | --- |
| 0:00 | Home, the kit tag playing | Who you are. "After Newtown, people sent over 63,000 teddy bears nobody asked for. Generosity isn't the problem. Not knowing what's needed is." |
| 0:20 | The tag reaching "Confirmed" | "KitGap tracks three numbers: promised, received, confirmed. Only the organization's confirmation counts as done." |
| 0:35 | Start the demo; bar shows 1/6 | "A guide walks through every side. I'm Jordan, a club coordinator. I'll take 20 of the 100 kits." |
| 0:55 | Go as Sam, pledge 10 notebooks | "Sam pledges. Promised moves; collected doesn't." |
| 1:15 | Go as Jordan, check in, pack, report delivery | "Packed and handed over still isn't counted." |
| 1:45 | Go as Maya, accept | "Only now does the count move." Point at the stamp in the bar. |
| 2:00 | "Built to be checked" on the home page, then your code | Show `requestTotals` or the concurrency test. "Two groups can't claim the same last kit; this test fails if they can." |
| 2:25 | Your own change and AI disclosure | What you wrote yourself, and how you used AI. |
| 2:40 | Home | "Give what's actually needed." |

## 6. Questions judges are likely to ask

- **"What did you write, and what did AI write?"** Have `docs/ai-usage.md` filled in, and one change you made yourself with a test.
- **"How do you stop two clubs taking the same kits?"** The row lock in `loadRequestState` (`src/server/services/core.ts`) and the test in `tests/integration/drives.test.ts`.
- **"Why should anyone trust the numbers?"** Totals are computed from records (`docs/quantity-model.md`), and only the receiving organization can confirm.
- **"Has anyone used it?"** Answer honestly: tested with N people (section 4), not yet deployed with a real organization.
- **"How is it different from Amazon wish lists?"** A group adopts a share and packs complete kits, and the receiver confirms. You don't claim to be the first goods-donation tool.

## 7. Before you submit

- [ ] Fill in `docs/ai-usage.md` yourself.
- [ ] Make the GitHub repository public if the rules require a code link, then set `REPO_URL` in `src/content/credibility.ts`.
- [ ] Add real field notes (section 4), or leave the section hidden.
- [ ] Rerun the integration tests against the local database (`npm run db:start`) and update `TEST_FACTS` if the counts change.
- [ ] Run `npm run test:e2e` once. The demo-walkthrough and accessibility tests were updated for the new demo bar but not run in this session.
- [ ] Deploy, or say "running locally" in the video.
