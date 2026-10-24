# Bringing sign-ups in from other tools

Clubs already collect who-brings-what with Google Forms and SignUpGenius. KitGap takes those responses in as **pledges** (promises). A coordinator still records what actually arrives. Imported people do not need KitGap accounts.

Guest emails stay with the drive's coordinators. They never appear on public pages or to other members.

---

## Tier 1 — CSV import (built)

On a drive, **Import sign-ups**. Upload:

- Google Forms: Responses → Download responses (.csv), or File → Download from the linked Sheet
- SignUpGenius: the sign-up report export
- Any other spreadsheet saved as CSV

KitGap guesses columns (name, email, item, quantity, comments) and maps answer text such as “Notebooks” to the drive's items. You confirm or fix the mapping, see a preview (what will be created, repeats, rows over the remaining need, errors), then confirm.

The import runs in one transaction through `mutate()`, with an idempotency key. Importing the same row again does not create a second pledge: each row has a fingerprint stored as `source_row_id`, unique per drive and source.

Sample files (fictional): `tests/fixtures/google-forms-sample.csv`, `tests/fixtures/signupgenius-sample.csv`. In the demo, **Try it with a sample Google Forms file** uses the same Google Forms sample.

---

## Tier 2 — live Google Forms webhook (built, real drives only)

No Google sign-in. The coordinator clicks **Connect a Google Form**. KitGap creates a secret URL, shows it once, and stores only a SHA-256 hash of the secret. Rotating replaces the hash. Withdrawing the drive turns the link off.

KitGap shows an Apps Script to paste into the form's script editor, with an `onFormSubmit` trigger that posts `{ responseId, answers }` via `UrlFetchApp`.

The endpoint is `POST /api/hooks/forms/[token]`:

- Looks up the hash, then compares it in constant time
- Validates the JSON body
- Maps question titles the coordinator saved to the drive's items
- Is idempotent on `responseId` + item
- Rate-limits to 30 posts per minute per drive
- Returns only `{ ok: true }` or `{ ok: false }` — never names, emails or answers

The demo sandbox does not accept live posts (those hit the real `kitgap` schema). In the demo, use CSV import.

### What to tell a judge, in your own words

We do not ask clubs to abandon the form they already use. A CSV upload covers a one-off export. If they want new responses to land as they come in, they paste a short script into Google's editor. The script sends each response to a private link. We never store that link, only a hash, so a leaked database dump is not enough to post fake pledges. A pledge is still only a promise: the coordinator counts what shows up.

---

## Tier 3 — planned, not built

### Google sign-in and the Forms API

Google's Forms API can list responses with the `forms.responses.readonly` scope. That scope is **restricted**. Google's OAuth verification for restricted scopes typically needs:

- A verified Google Cloud project and OAuth consent screen
- A security assessment (often CASA) for production access
- A privacy policy, homepage, and demo video
- Weeks of review, not a weekend toggle

Until that is approved, Apps Script + a hashed webhook is the honest path: the club authorizes *their own* script, not KitGap as a Google app.

If we add it later: store refresh tokens encrypted, poll or push via a push watch if Google adds one for Forms, keep the same guest-pledge model and unique `(commitment, source, source_row_id)` key, and never show respondent emails outside coordinators.

### SignUpGenius API

SignUpGenius documents an API for some paid plans. As of this writing it is not a free public API we can ship against without a partner key and a paid organizer account. Until that is confirmed with current docs and pricing:

- Use the CSV export (Tier 1)
- Do not promise live SignUpGenius sync

If a paid API becomes available: same guest pledges, map slots to items, idempotent on their member/slot id, store only a hash of any shared secret.

---

## Security notes

- Writes go through `mutate()`. The webhook looks up who connected the form and records them as the actor.
- A pledge never counts as collected.
- The unique index on `(commitment_id, import_source, source_row_id)` is what stops a replay, not the client.
- The raw webhook URL is shown once. Rotate if it is lost or leaked.
