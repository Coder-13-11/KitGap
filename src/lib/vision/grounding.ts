// Several phrases in one Grounding DINO pass: "bag. pencil. toothbrush."
// The library's own phrase decoder garbles labels when phrases share boxes, so
// this scores each phrase from its own tokens instead. One pass costs the same
// whether it asks about one thing or forty.

import type { Detection } from "./count";

export interface TokenizerLike {
  (text: string | string[], options?: Record<string, unknown>): { input_ids: { data: ArrayLike<bigint | number>; dims: number[] } };
}

interface TensorLike {
  data: ArrayLike<number>;
  dims: number[];
}

export interface Prompt {
  text: string;
  // For each phrase, the prompt positions of the first token of each word
  // that carries meaning. Word pieces ("##te") and filler words ("of", "a")
  // fire on almost anything, so they don't count.
  spans: { phrase: string; keys: number[] }[];
}

const FILLER = new Set(["a", "an", "the", "of", "for", "and", "with"]);

// Builds "a bag. a pencil." and works out where each phrase's tokens land.
// Grounding DINO uses a BERT tokenizer: [CLS] tokens... [SEP], and "." is one token.
export function buildPrompt(tokenizer: TokenizerLike, phrases: string[]): Prompt {
  const spans: Prompt["spans"] = [];
  let at = 1;
  for (const phrase of phrases) {
    const keys: number[] = [];
    for (const word of phrase.split(/\s+/).filter(Boolean)) {
      const n = tokenizer(word, { add_special_tokens: false }).input_ids.dims.at(-1) ?? 0;
      if (!FILLER.has(word.toLowerCase())) keys.push(at);
      at += n;
    }
    spans.push({ phrase, keys: keys.length ? keys : [at - 1] });
    at += 1;
  }
  return { text: phrases.map((p) => `${p}.`).join(" "), spans };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Turns raw model output into one detection per query box, labelled with the
// phrase that box matches best. Boxes are in image pixels.
//
// "count" scores a box by its strongest token, exactly like the library's
// pipeline, so the settings measured in scripts/vision-eval.ts hold.
// "name" scores by each phrase's own words, to tell phrases apart.
export function decode(
  logits: TensorLike,
  predBoxes: TensorLike,
  prompt: Prompt,
  width: number,
  height: number,
  mode: "count" | "name" = "count",
  minScore = 0.03,
): Detection[] {
  const [, queries, tokens] = logits.dims;
  const out: Detection[] = [];
  for (let q = 0; q < queries; q++) {
    let bestPhrase = "";
    let best = 0;
    for (const span of prompt.spans) {
      let sum = 0;
      for (const t of span.keys) if (t < tokens) sum += sigmoid(logits.data[q * tokens + t]);
      const score = sum / span.keys.length;
      if (score > best) {
        best = score;
        bestPhrase = span.phrase;
      }
    }
    if (mode === "count") {
      best = 0;
      for (let t = 0; t < tokens; t++) best = Math.max(best, sigmoid(logits.data[q * tokens + t]));
    }
    if (best < minScore) continue;
    const [cx, cy, w, h] = [0, 1, 2, 3].map((k) => predBoxes.data[q * 4 + k]);
    out.push({
      score: best,
      label: bestPhrase,
      box: { xmin: (cx - w / 2) * width, ymin: (cy - h / 2) * height, xmax: (cx + w / 2) * width, ymax: (cy + h / 2) * height },
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// "What is this one thing?" Ranks phrases by how strongly the most prominent
// object in the photo matches them.
export function identify(dets: Detection[], width: number, height: number, top = 3): { phrase: string; score: number }[] {
  const imageArea = Math.max(1, width * height);
  const big = dets.filter((d) => ((d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin)) / imageArea > 0.04);
  const best = new Map<string, number>();
  for (const d of big.length ? big : dets) best.set(d.label, Math.max(best.get(d.label) ?? 0, d.score));
  return [...best.entries()]
    .map(([phrase, score]) => ({ phrase, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
