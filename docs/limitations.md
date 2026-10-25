# Known limitations

An honest list of what KitGap does not do, or has not been checked to do.

## Not built (on purpose, for the first release)

- No payments or money tracking. An organization can show a link to its own fundraising page, clearly labelled as external.
- No messaging between people beyond delivery notes, review notes, organization updates and the activity log.
- No maps, route planning, shopping links, AI chat, matching between groups and requests, or inventory management.
- No live SignUpGenius sync. SignUpGenius sign-ups come in through CSV import only.

## A club's own drive and receipt links

- A club can run a drive for a recipient that isn't on KitGap (**Run your own drive**). It's never listed, has no public request page, and other groups can't join it. The recipient is stored as a workspace with no members.
- The recipient confirms a delivery through a **receipt link** (or its QR code) with no account, signing with a typed name. A signed-in member of the club is refused, but **KitGap can't prove who opened the link**: a coordinator who kept it could confirm their own delivery while signed out. That is why these confirmations are labelled **"Confirmed by recipient"** (an outlined stamp) and kept apart from **"Confirmed"** by a KitGap-verified organization. A club's public record shows them separately, and they don't count toward its milestones.
- A receipt link is shown once. Making a new one switches the old one off. The links are long random secrets, stored only as a hash, but there is no rate limit on the receipt page.
- The number of kits in a club's own drive can be lowered, not raised. To make more, start another drive.
- If the recipient later joins KitGap, there's no way yet to move the drive to its account or upgrade earlier receipt confirmations to "Confirmed". That needs a reviewer tool.

## Experimental features

These two features work, but they sit outside KitGap's main loop (request, drive, delivery, confirmation). Nothing they produce counts toward any total.

### Count with a photo (`/tools`)

- Counts items in a photo with an object-detection model (`onnx-community/grounding-dino-tiny-ONNX`) that runs in the browser. The photo is never uploaded. The model, about 205 MB, is downloaded from Hugging Face the first time.
- Accuracy was measured on a small labelled set: exact on 61 of 72 photos (85%), within one on 68 (94%), and within one on 10 of 13 photos of real donations. That set is too small to generalize from. Tight bundles of pencils and stacked rolls count worst.
- A count is a suggestion. It can be saved as "items given" on an outside sign-up joined through Discover, but it never changes a KitGap drive's received, packed or confirmed numbers. Coordinators still record what arrived by hand.
- It needs a recent desktop or phone browser with enough memory. It has not been tested on low-end phones.

### Discover drives (`/discover`)

- Searches the public web through Exa for drives posted elsewhere (SignUpGenius, JustServe, public social posts), then ranks and filters the results with simple keyword and date rules (`src/server/discovery/rank.ts`).
- **Results are not reviewed by a person**, unlike KitGap requests. They link to other sites that KitGap does not run, and a result may be out of date or wrong. The page says so and tells anyone under 18 to bring a parent or teacher.
- Without an `EXA_API_KEY`, it uses Exa's public endpoint, which is rate limited. Searches can fail or come back empty when that happens.
- The "Big drives that run every year" list is a fixed set of links to national programs. KitGap has no relationship with them.
- No email or push notifications. In-app **Updates** (with an unread count) is the only notification.
- One organization timezone per request; organizations don't have a default timezone setting.
- No account deletion page. Deleting a person currently means removing their Supabase Auth user and profile by hand.

## Behavior to know about

- A group has at most one active drive per request; it changes that drive's quantity instead of starting another.
- A reviewer must confirm an organization's contact before its requests can be published. Changing the contact details removes the confirmation.
- Once any group has started a drive, the request's quantity and items can't change. The organization can copy the request into a new draft. Descriptions and handover details can still be edited.
- A delivery's review can't be changed after it's saved. If a mistake is made, the group can report the not-accepted kits as fixed and deliver them again, but an accepted count can't be reduced in the app.
- Packing a kit records that its items were used; repairs of returned kits don't record which replacement items were used.
- Item names are matched for duplicates with a simple English rule (plural "s", "es", "ies"). It catches "Notebook" and "notebooks", not synonyms.
- Plural wording is a heuristic and may read oddly for unusual nouns.

## Not verified

- No real users have tested it yet. Use `docs/user-testing.md`.
- Not tested with screen readers, real phones, browsers other than Chromium, or under load (see `docs/accessibility.md` and `docs/testing.md`).
- Not deployed. The deployment steps in `docs/setup.md` haven't been run against a real Supabase project or Vercel.
- Email delivery was tested only with the local mail catcher. Production needs an SMTP provider.
- The demo uses fixed sample people instead of real sign-in. It shows the rules and the interface, not real authentication; the real sign-in path is covered separately by `tests/e2e/live-auth.spec.ts`.

## Security notes

- Authorization is enforced in server code (`src/server/services`), not in database row-level security policies. The database denies all direct access from the browser API roles, but a bug in a service's permission check would not be caught by the database. The integration tests check the important permissions with direct calls.
- Sign-in attempts are rate-limited by Supabase Auth. The Google Forms webhook allows 30 posts per minute per drive. KitGap's other actions (pledges, imports, demo creation, Discover searches) have no rate limiting. Demo sandboxes are capped at 300 and cleaned up after a day.
- Content that people type is shown as plain text (React escapes it). Links are only allowed on the fundraising field, and only `https://` addresses.
