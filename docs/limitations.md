# Known limitations

Things KitGap doesn't do yet, or that haven't been checked.

## Not built

- No payments. An organization can link to its own fundraising page, marked as external.
- No email or push notifications. The in-app Updates page is the only one.
- No account deletion page. Both app stores require one before KitGap can be listed, so it isn't in the App Store or Google Play yet (see `docs/mobile.md`).
- If a recipient of a club's own drive later joins KitGap, the drive can't be moved to their account.

## Behavior to know about

- A group has one active drive per request. Starting again changes that drive's number instead.
- Once a group has started a drive, the request's quantity and items are locked. The organization can copy it into a new draft.
- A delivery's review can't be undone. Kits that weren't accepted can be fixed and delivered again, but an accepted count can't be lowered.
- Receipt links (for a club's own drive) can't prove who opened them, so those confirmations are labelled "Confirmed by recipient" and kept separate from confirmations by a checked organization.
- Duplicate item names are caught with a simple plural rule ("notebook" and "notebooks"), not synonyms.
- View counts count page loads, not people.

## Extras outside the main counts

- **Count with a photo** (`/tools`) runs an object-detection model in the browser (about 205 MB the first time). On a small set of test photos it was exact 85% of the time. A count never changes a drive's numbers.
- **Found online** searches the web with Exa. Results aren't checked by a person and may be out of date.
- **Kit** answers with an AI model on an outside endpoint. It only gets names, totals, deadlines and page views, never emails or drop-off details, and any draft with a number that isn't in the real data is thrown away. Signed-out visitors get the written (non-AI) answers.

## Not verified

- Not tested with real users, screen readers, real phones, or browsers other than Chromium.
- Email has only been tested locally. Production needs an SMTP provider.
- Authorization lives in server code (`src/server/services`), not in database policies. The database blocks all direct access from the browser, and the integration tests cover the important permission checks.
- Only Supabase sign-in is rate-limited. Demo sandboxes are capped at 300 and cleaned up after a day.
