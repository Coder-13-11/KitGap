// The words that go with a shared need: short, plain, and specific about
// what to bring, because specific asks are the ones people act on.

import { formatCalendarDate } from "./dates";
import { countNoun, listPhrase, pluralize } from "./text";

export function shareCaption(input: {
  orgName: string;
  still: number;
  unitName: string;
  items: string[];
  neededBy: string | null;
  url: string;
}): string {
  const what = input.still > 0 ? countNoun(input.still, input.unitName) : `more ${pluralize(input.unitName).toLowerCase()}`;
  const by = input.neededBy ? ` by ${formatCalendarDate(input.neededBy)}` : "";
  const items = input.items.length > 0 ? ` Each one is ${listPhrase(input.items.slice(0, 4))}.` : "";
  return `${input.orgName} needs ${what}${by}.${items} Bring only what's on the list, and see it confirmed when it arrives: ${input.url}`;
}
