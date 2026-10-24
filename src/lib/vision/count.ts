// Turns raw object-detector output into a count people can trust. Shared by
// the in-browser counter and the accuracy test in scripts/vision-eval.ts, so
// the numbers measured there are the numbers people get.

export interface Box {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface Detection {
  box: Box;
  score: number;
  label: string;
}

export interface CountSettings {
  // Ignore anything the model is less sure of than this.
  minScore: number;
  // Also ignore anything far less sure than the best match in the photo.
  relScore: number;
  // Two boxes overlapping more than this are the same object.
  iou: number;
  // Stop at a score drop to below this share of the box before (0 or unset: off).
  gap?: number;
}

export interface CountResult {
  count: number;
  kept: Detection[];
  confidence: "high" | "medium" | "low";
  crowded: boolean;
}

export const area = (b: Box) => Math.max(0, b.xmax - b.xmin) * Math.max(0, b.ymax - b.ymin);

export function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin));
  const iy = Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
  const inter = ix * iy;
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

// Share of box a that lies inside box b.
function insideShare(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin));
  const iy = Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
  const own = area(a);
  return own > 0 ? (ix * iy) / own : 0;
}

export function nonMaxSuppression(dets: Detection[], threshold: number): Detection[] {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (kept.every((k) => iou(k.box, d.box) <= threshold)) kept.push(d);
  }
  return kept;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function countDetections(dets: Detection[], width: number, height: number, settings: CountSettings): CountResult {
  const imageArea = Math.max(1, width * height);
  let pool = dets.filter((d) => d.score >= settings.minScore);
  pool = nonMaxSuppression(pool, settings.iou);

  // A box drawn around a whole pile contains several single-item boxes.
  // Keep the items, drop the pile.
  pool = pool.filter((d) => {
    const inner = pool.filter((o) => o !== d && area(o.box) < area(d.box) * 0.7 && insideShare(o.box, d.box) > 0.8);
    return inner.length < 2;
  });

  if (pool.length > 1) pool = pool.filter((d) => area(d.box) < imageArea * 0.85);

  const top = pool.reduce((m, d) => Math.max(m, d.score), 0);
  pool = pool.filter((d) => d.score >= top * settings.relScore);

  // Real items usually score in a tight band, with a clear drop before the
  // look-alikes. Cut at the first big drop.
  if (settings.gap && pool.length >= 2) {
    pool.sort((a, b) => b.score - a.score);
    const at = pool.findIndex((d, i) => i > 0 && d.score < pool[i - 1].score * settings.gap!);
    if (at > 0) pool = pool.slice(0, at);
  }

  // Slivers far smaller than the typical item are usually parts of one.
  const typical = median(pool.map((d) => area(d.box)));
  if (pool.length >= 4) pool = pool.filter((d) => area(d.box) >= typical * 0.12);

  const overlapping = pool.filter((d) => pool.some((o) => o !== d && iou(o.box, d.box) > 0.15)).length;
  const crowded = pool.length >= 3 && overlapping / pool.length > 0.35;

  // How clearly the kept boxes stand out from the ones just below the cut.
  const cut = Math.max(settings.minScore, top * settings.relScore);
  const nearMiss = dets.filter((d) => d.score < cut && d.score >= cut * 0.75).length;
  const confidence = pool.length === 0 ? "low" : crowded || nearMiss > Math.max(2, pool.length * 0.3) ? "medium" : "high";

  return { count: pool.length, kept: pool, confidence: top < settings.minScore * 1.5 ? "low" : confidence, crowded };
}

// Everyday names for what people count, mapped to the phrase the detector
// counts best (measured in scripts/vision-eval.ts). Long thin things are
// counted by their tips: in a row of pencils the tips stay apart even when
// the bodies overlap. "aliases" catch what people type.
export interface CountPreset {
  id: string;
  label: string;
  queries: string[];
  aliases: string[];
  tip?: string;
}

export const COUNT_PRESETS: CountPreset[] = [
  { id: "bags", label: "Bags", queries: ["a bag"], aliases: ["bag", "tote", "grocery bag", "plastic bag", "paper bag"] },
  { id: "backpacks", label: "Backpacks", queries: ["a backpack"], aliases: ["backpack", "book bag", "bookbag", "school bag"] },
  { id: "boxes", label: "Boxes", queries: ["a cardboard box"], aliases: ["box", "cardboard box", "carton", "case"] },
  { id: "kits", label: "Kits", queries: ["a bag", "a box"], aliases: ["kit", "hygiene kit", "care package", "bundle"] },
  { id: "cans", label: "Cans", queries: ["a can"], aliases: ["can", "canned food", "tin", "soup can"] },
  { id: "bottles", label: "Bottles", queries: ["a bottle"], aliases: ["bottle", "water bottle", "shampoo"] },
  {
    id: "pencils",
    label: "Pencils",
    queries: ["the tip of a pencil"],
    aliases: ["pencil", "colored pencil", "crayon", "pen", "marker"],
    tip: "Point every tip the same way, side by side.",
  },
  { id: "notebooks", label: "Notebooks", queries: ["a notebook"], aliases: ["notebook", "book", "folder", "binder", "composition book"] },
  {
    id: "rolls",
    label: "Paper rolls",
    queries: ["a paper roll"],
    aliases: ["roll", "toilet paper", "paper towel", "tissue roll", "roll of toilet paper", "roll of paper towels"],
    tip: "Stand rolls up in a single layer instead of stacking them.",
  },
  { id: "toothbrushes", label: "Toothbrushes", queries: ["a toothbrush"], aliases: ["toothbrush", "toothpaste"] },
  { id: "clothes", label: "Clothes", queries: ["a piece of clothing"], aliases: ["shirt", "coat", "jacket", "sock", "clothing", "clothes", "sweater"] },
  { id: "toys", label: "Toys", queries: ["a toy"], aliases: ["toy", "stuffed animal", "doll", "game"] },
];

export function presetFor(text: string): CountPreset | null {
  const n = singular(text);
  if (!n) return null;
  return COUNT_PRESETS.find((p) => p.id === text.trim().toLowerCase() || p.aliases.includes(n)) ?? null;
}

// What to ask the detector for, for a preset id or anything typed.
export function queriesFor(text: string): string[] {
  return presetFor(text)?.queries ?? [queryFor(text)];
}

// Labels tried when someone snaps one item and asks "what is this?".
export const REFERENCE_VOCABULARY = [
  "bag",
  "backpack",
  "cardboard box",
  "can",
  "bottle",
  "pencil",
  "pen",
  "marker",
  "crayon",
  "notebook",
  "book",
  "folder",
  "binder",
  "scissors",
  "glue stick",
  "ruler",
  "calculator",
  "paper towel roll",
  "toilet paper roll",
  "toothbrush",
  "toothpaste",
  "soap",
  "shampoo bottle",
  "deodorant",
  "towel",
  "sock",
  "shirt",
  "jacket",
  "hat",
  "glove",
  "blanket",
  "diaper",
  "baby wipes",
  "cereal box",
  "jar",
  "water bottle",
  "toy",
  "stuffed animal",
  "shoe",
  "lunch box",
];

export function singular(noun: string): string {
  const n = noun.trim().toLowerCase().replace(/\s+/g, " ");
  // "rolls of paper towels" -> "roll of paper towels"
  const of = n.match(/^(\S+)( of .+)$/);
  if (of) return `${singular(of[1])}${of[2]}`;
  if (/(ches|shes|xes|sses|zes)$/.test(n)) return n.slice(0, -2);
  if (/ies$/.test(n)) return `${n.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(n)) return n;
  if (/s$/.test(n)) return n.slice(0, -1);
  return n;
}

export function queryFor(noun: string): string {
  const n = singular(noun);
  if (!n) return "an object";
  if (/^(a|an|the)\s/.test(n)) return n;
  return `${/^[aeiou]/.test(n) ? "an" : "a"} ${n}`;
}
