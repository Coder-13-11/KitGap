# Known limitations

An honest list of what KitGap does not do, or has not been checked to do.

## Not built (on purpose, for the first release)

- No payments or money tracking. An organization can show a link to its own fundraising page, clearly labelled as external.
- No messaging between people beyond delivery notes, review notes, organization updates and the activity log.
- No maps, route planning, shopping links, item recognition, AI chat, matching suggestions, rankings or inventory management.
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
- Sign-in attempts are rate-limited by Supabase Auth. KitGap's own actions (pledges, demo creation) have no rate limiting. Demo sandboxes are capped at 300 and cleaned up after a day.
- Content that people type is shown as plain text (React escapes it). Links are only allowed on the fundraising field, and only `https://` addresses.
