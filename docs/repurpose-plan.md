# Repurpose plan: a community donation board anyone can use

Written October 25, 2026, from the owner's feedback and a tester's first reaction ("what is this? too many words, looks complex, not for me").

## 1. What the judges reward, and what past winners did

- **The 2025 rules score three things:** the quality of the idea (creativity and originality), the implementation (user experience and design), and coding skill ([2025 CAC rules](https://morgangriffith.house.gov/UploadedFiles/2025-CAC-Rules.pdf), [judges page](https://www.congressionalappchallenge.us/get-involved/judges/)).
- **Winners near our idea are simple, single-purpose community tools:**
  - **FindFoodPantries** (CA-49, 2024): a directory of nearby food banks, built by a student who volunteered at his church's pantry ([CAC](https://www.congressionalappchallenge.us/24-CA49/)).
  - **ServeIT** (NC-6, 2024): encourages donations of time and goods to fight food insecurity ([CAC](https://www.congressionalappchallenge.us/24-NC06/)).
  - **Fill Food Banks** (CA-47, 2023) ([CAC](https://www.congressionalappchallenge.us/23-CA47/)).
  - **MAZAH**, fighting food waste one meal at a time, and **Swell**, puzzles for senior citizens (2025) ([Joyce](https://joyce.house.gov/posts/joyce-announces-2025-congressional-app-challenge-winners)).
- **The pattern:** one clear community problem, one clear action, understood in seconds, and a personal reason to build it. None of them is a multi-role workflow tool.

**Takeaway for KitGap:** the engineering is already stronger than most entries. What loses points now is the *first impression*: too many roles, tabs, terms and sentences. Narrow it to one promise a grandparent or a 10-year-old gets right away.

## 2. The new promise

> **See what your community needs. Help. Watch it arrive.**

KitGap becomes a **community needs board**. Local places (food pantries, shelters, schools, senior homes, animal shelters) post exactly what they need. Neighbors find it, pledge, drop it off, and see it confirmed.

### Who comes first

1. **Community organizations:** shelters, food pantries, schools, senior homes, animal shelters and pet rescues. They post needs and get help without extra work.
2. **People who want to help:** neighbors, families, students, including anyone who was sent a link.
3. **School clubs:** still supported (club drives, receipt links), but shown last.

## 3. What changes (and what stays)

### Keep (it's what makes this credible)

The quantity rules, "only what the organization confirms counts", the reviewer check, privacy, the demo, the receipt link, the installable app and the tests.

### Change

| Area | Now | Proposed |
| --- | --- | --- |
| **Main navigation** | Requests, How it works, My drives, My organization, Updates, Home | **4 tabs: Home · Find · My giving · Profile.** Updates becomes a dot on Profile. "How it works" moves into the home page. Organizations get their dashboard from Profile. |
| **Find** (was Requests) | Only KitGap requests; "Find drives elsewhere" hidden in the footer | **One place to find drives:** "Near you on KitGap" first, then "More drives near you" (the web search, clearly labelled "found online, not checked by KitGap"). This answers the cold start: there's always something to help with. |
| **Categories** | School supplies, hygiene, winter, baby, food, other | Add **Seniors** and **Pets**. Each category gets a big, simple icon and color, so the board is scannable without reading. |
| **Sign-up** | 3 options, club first | **"I run a community organization"** (shelter, pantry, school, senior home, animal shelter), then **"I want to help / I was invited"**, then **"School club"** last. |
| **Home (signed out)** | Clubs-first copy | One line, 3 picture steps (Find → Bring → Confirmed), the category icons, and live numbers ("12 open needs near Kissimmee"). Shorter text, bigger touch targets. |
| **Home (signed in)** | "Finish your draft request" and getting-started lists | One card: **your next step**, then **needs near you**. Nothing else above the fold. |
| **Words** | Coordinator, commitment, adopt, pledge, reserved | Plain words: *help, bring, drop off, confirmed*. Short sentences, aiming for about a 5th-grade reading level. No slogans. |

### Add (small, high-value, for this deadline)

1. **Share kit for each need and drive.** It fits the channels people already use (Instagram, Facebook, Canvas announcements, group chats):
   - a ready-made square post image (need, progress bar, QR code), downloadable;
   - a short caption to copy;
   - share buttons for the phone's share sheet (which reaches Instagram and WhatsApp), Facebook, email and copy link.

   *Note:* Instagram has no way for a website to open a post with the caption already filled in. The share sheet sends the image, and the caption is copied for pasting.
2. **"How many people this reached".** The share page counts views (no personal data) and shows "seen 214 times · 18 people pledged". Organizations see their reach grow, which is the expanding-reach story for judges.

### Later (after the video; listed so it isn't lost)

- Photo proof of drop-offs (needs a storage bucket and photo rules).
- Volunteer-hours log (brainstorm C4).
- A no-account pledge link (C3).
- Kit tags (C5), check-in mode (C6), certificate (C7).

## 4. Images: what we can and can't use

**We can't take nonprofits' logos or their photos from their websites.**
- Logos are trademarks. Showing them suggests those groups partner with or endorse KitGap, which they don't.
- Their photos are copyrighted, and many show identifiable people, including children.
- A judge who notices borrowed logos would treat it as a credibility problem, the opposite of what we want.

What we can do, all honest:
- **Clear category icons and simple illustrations** (food, school, seniors, pets, shelter). These help a child or an older person most.
- **Openly licensed photos of donated goods and drives** (Unsplash, already used, or Creative Commons with credit). Photos of people need a deliberate choice, because PRODUCT.md says "No photos of people".
- **Real organizations by name, in text, with links** in the "More drives near you" results. That's factual reference, not endorsement.
- **Their own photos, with written permission:** if a local pantry agrees, add its photos and logo to its own page.

## 5. Name

"KitGap" is short and already on everything (logo, icons, app projects, docs). But "kit" undersells pet food, senior supplies and single items.

| Option | For | Against |
| --- | --- | --- |
| **Keep KitGap** (recommended for this deadline) | No risk the day before recording; the logo and story already fit | Less obvious meaning |
| **Neighborly Needs** | Says exactly what it is | Long; generic |
| **GiveList** | Short, plain, fits "bring only what's on the list" | Similar names likely exist; would need checking |

Renaming touches the logo, icons, native app IDs and every page, so it's safer as a post-deadline decision.

## 6. Build order (for this weekend)

1. Navigation: 4 tabs plus a Profile menu.
2. Find: KitGap needs plus "More drives near you" on one screen.
3. Categories: Seniors and Pets (migration 0006), with icons and colors.
4. Sign-up order and wording; the signed-in home reduced to one next step plus nearby needs.
5. Home page and plain-language pass on the main screens.
6. Share kit and reach counter.
7. Re-test on phone and desktop, update the demo and the docs.

## 7. Built (October 25, 2026)

- **Navigation:** Home · Find · My giving · Profile on phones (tab bar) and desktop. Updates, organizations, groups, the review queue and settings are under Profile (`/me`).
- **Find** (`/requests`): category icons, then "On KitGap" and "Found online" tabs. `/discover` now redirects to the online tab.
- **Categories:** Seniors and Pets added (migration 0006), with an icon and color for every category on cards and in Find.
- **Sign-up order:** community organization → want to help or invited → school club. Helpers land on Find after confirming their email.
- **Signed-in home:** next step, what you're helping with, needs near you. The getting-started lists and update feed moved off the home page.
- **Home page and wording:** a community-first hero with a food pantry example and category icons, plus plain words across the need page, the start-helping form and the status badges.
- **Share kit** on each need: a square post image with a QR code (`/requests/[id]/post-image`), the share sheet (Instagram, WhatsApp and more through the phone), Save image, Copy caption, Facebook, WhatsApp and Email.
- **Reach:** view counts on need pages and drive share pages (migration 0006, `page_views`).

Added the same day, while polishing for judging:

- **A full sample board in the demo:** Westside Food Pantry (weekend food bags, 12 of 40 already confirmed), Palm Grove Senior Living (comfort kits) and Osceola Paws Rescue (dry dog food), next to the school and winter needs. All marked "(sample)". Checked by `tests/integration/demo-community.test.ts`.
- **Empty boards point somewhere:** when the live board has no needs yet, Find and Home offer drives found online and the sample board.
- **Shorter drive page on phones:** only the newest entries of the received-supplies log and activity are shown, with "Show more", and "Change this drive" is folded.
- **Fixes found by the browser tests:** a success message could vanish when a save finished just as the previous message expired, and the error box could scroll under the sticky header.

Not built yet: photo proof of drop-offs, a no-account pledge link, hours log, kit tags, check-in mode, certificate (see section 3, "Later").
