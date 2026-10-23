# Accessibility

The target is WCAG 2.2 level AA for the screens built so far. This page records what was actually checked. It is not a certification: automated scans find only part of the possible problems, and no one has yet tested KitGap with a screen reader.

## Checked automatically

`tests/e2e/accessibility.spec.ts` runs axe-core (rule tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) on:

- public pages: home, request directory, about, sign-in, sign-up, forgot password, demo start
- demo screens: request detail, start a drive, drive workspace (coordinator), drive workspace with form errors showing, my drives, public drive page, organization workspace, manage request, new request form, review queue

Latest result: **0 violations**. The first run found two problems, which were fixed:

1. Inline links were distinguishable only by color (Tailwind's CSS reset removes underlines). All links are now underlined; navigation and button-style links opt out deliberately.
2. Definition lists had invalid structure (icons and wrappers directly inside `<dl>` groups).

## Checked by design and by test

- **Labels and instructions:** every field has a visible `<label>`; hints and errors are tied to the field with `aria-describedby`; invalid fields have `aria-invalid`. Placeholders are never the only label.
- **Errors** (GOV.UK error summary pattern): a failed save shows a "There is a problem" summary that takes focus and links to each field, plus the message next to the field. Entries are kept. Verified in e2e: the keyboard-only sign-in test checks that focus lands on the summary and the email is kept.
- **Status messages:** success messages are announced once through a single polite live region (the toast), so they're heard even when the form that triggered them disappears. Errors move focus instead of using a live region, which avoids double announcements.
- **Keyboard:** a skip link to the main content; all actions are real buttons and links; dialogs use the native `<dialog>` element (focus is trapped, Escape closes, focus returns to the opener); the account menu closes on Escape. Fields are disabled while a form is saving, to prevent double submission.
- **Focus:** a 3 px focus outline (#1e6b9a, at least 5.4:1 against the backgrounds).
- **Color contrast** (computed with a script; see the comment in `src/app/globals.css`): body text 14.1:1; muted text 5.7 to 6.5:1; the green and clay accents at least 5.6:1; field borders at least 3.2:1. Status is never shown by color alone: badges have icons and words, and progress bars have number legends and a screen-reader sentence.
- **Motion:** state changes fade in over 180 ms; all animation is turned off with `prefers-reduced-motion`.
- **Reflow and zoom:** no horizontal scrolling at 320, 390, 768 and 1440 px on any of the main screens (checked automatically while taking screenshots). 320 px is equivalent to 400% zoom on a 1280 px window. Long titles, long organization names and 100,000-unit quantities were checked at 320 px.
- **Touch targets:** primary controls are at least 44 × 44 px; small secondary buttons are 36 px tall, above the WCAG 2.2 minimum of 24 px.
- **Sticky action:** the mobile "Start a drive" bar hides while the adoption form is on screen and while any field has focus, so it never covers a field, an error or the keyboard.

## Still to check by hand

- Screen readers: NVDA with Firefox, VoiceOver on iPhone and Mac, TalkBack on Android. Especially check the multi-step request form, the supplies table, and the review decision.
- Real phones (iOS Safari, Android Chrome) with the on-screen keyboard open.
- Browser zoom at 200% and 400%, and text-only zoom.
- Windows high-contrast (forced colors) mode.
- Voice control (Voice Access, Voice Control): every button's visible text should match its accessible name.
- Testing with people who use assistive technology.
