// What the public pages may claim about KitGap. Everything here must stay
// true and checkable: a claim without a source or a test behind it doesn't
// belong. See docs/presentation-review.md.

/** Public link to the source code. Leave null until the repository is public, so the page never shows a broken link. */
export const REPO_URL: string | null = null;

/** Test counts as last run. Update them when the suite changes. */
export const TEST_FACTS = {
  asOf: "October 25, 2026",
  unit: 85,
  integration: 56,
  browser: 6,
};

/**
 * Quotes from real people who used KitGap, with their consent. Keep it empty
 * until you have one: the home page hides the section when it's empty.
 *
 * Every entry must be real, unedited apart from trimming, and approved by the
 * person. Never invent, paraphrase into praise, or use AI to write one. For a
 * student under 18, use a first name or role only and get a parent's okay.
 * Fake testimonials are illegal in the US (FTC rule, 16 CFR Part 465) and
 * would sink the project's credibility.
 */
export interface FieldNote {
  quote: string;
  /** For example "Ms. Rivera, front office, Lakeside Elementary" or "Club coordinator, 11th grade". */
  attribution: string;
  /** What they did, for example "Posted a 40-kit request in a test session". */
  context: string;
  /** When it was said, for example "October 2026". */
  date: string;
}

export const FIELD_NOTES: FieldNote[] = [];
