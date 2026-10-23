// Small wording helpers so quantities always read as "20 backpacks", never
// "20 backpack(s)". The plural rule is a heuristic for English nouns; it
// handles "box of crayons" -> "boxes of crayons" by pluralizing the head noun.

const IRREGULAR: Record<string, string> = {
  child: "children",
  person: "people",
  man: "men",
  woman: "women",
  foot: "feet",
  tooth: "teeth",
  mouse: "mice",
  sheep: "sheep",
  scissors: "scissors",
  pants: "pants",
  supplies: "supplies",
};

function pluralizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR[lower]) {
    const plural = IRREGULAR[lower];
    return word[0] === word[0].toUpperCase() ? plural[0].toUpperCase() + plural.slice(1) : plural;
  }
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + "es";
  return word + "s";
}

export function pluralize(noun: string): string {
  const trimmed = noun.trim();
  if (!trimmed) return trimmed;
  // Pluralize the head noun before a qualifier: "pack of pencils", "kit (ages 5-8)".
  const match = /^(.*?)(\s+(?:of|for|with|in)\s+.*|\s*\(.*\))$/i.exec(trimmed);
  if (match && match[1]) {
    return pluralize(match[1]) + match[2];
  }
  const parts = trimmed.split(/\s+/);
  const last = parts.pop()!;
  return [...parts, pluralizeWord(last)].join(" ");
}

export function countNoun(count: number, noun: string, options: { lower?: boolean } = {}): string {
  const word = count === 1 ? noun.trim() : pluralize(noun);
  const text = options.lower === false ? word : word.toLowerCase();
  return `${formatCount(count)} ${text}`;
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Lower-case, collapse whitespace, drop trailing plural "s" and punctuation so
// "Notebook", " notebooks " and "NOTEBOOKS." are recognised as one entry.
// "Pencil pack" and "Pencil" stay different on purpose.
export function normalizeItemKey(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9()\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(" ").map(singularizeWord).join(" ");
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (/[^aeiou]ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (/[^s]s$/.test(word)) return word.slice(0, -1);
  return word;
}
