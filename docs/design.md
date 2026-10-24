# Design system

The visual world lives in [`../../DESIGN.md`](../../DESIGN.md) (The Shipping Room) and in `src/app/globals.css`. This file keeps the motion and interaction rules that are specific to the app.

## Motion

All motion lives in `globals.css` and `src/components/ui/motion.tsx`.

- `rise`: content slides up into place on load. Stagger with `--i`.
- `Reveal`: slides content up as it scrolls into view.
- `lift`: tags rise 2px on hover and focus.
- `press`: buttons scale down slightly while pressed.
- `CountUp`: numbers count up once on screen. Screen readers hear only the final value.
- `skeleton`: shimmering placeholders in `loading.tsx` files.

Rules:

1. Animate `transform` only. Opacity stays at 1 so text contrast never dips mid-animation (axe checks it).
2. Content is always readable before and without JavaScript; motion only moves it.
3. `prefers-reduced-motion: reduce` turns every animation and transition off.

## Interaction

- Targets are at least 24 by 24 px; primary buttons are 44 px tall.
- Filters are one tap: status chips are links that keep the other filters. Extra filters fold away on phones.
- Every screen ends in an action. Empty states link to the next useful place.
