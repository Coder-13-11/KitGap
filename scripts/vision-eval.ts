// Measures how accurately the photo counter counts, on labelled photos.
//
//   npx tsx scripts/vision-eval.ts detect <model> <images-dir>   run the model once, cache raw boxes
//   npx tsx scripts/vision-eval.ts score <model> <images-dir>    tune and report accuracy from the cache
//
// <images-dir> holds the photos and a meta.json of { file, noun, n } rows.
// Settings are tuned on half the photos and reported on the other half, so
// the reported accuracy isn't flattered by tuning on the same photos.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { countDetections, queriesFor, queryFor, type CountSettings, type Detection } from "../src/lib/vision/count";

interface Row {
  file: string;
  noun: string;
  n: number;
}
interface Cached {
  file: string;
  width: number;
  height: number;
  dets: Detection[];
}

const [mode, model, dir] = process.argv.slice(2);
if (!mode || !model || !dir) {
  console.error("usage: vision-eval.ts detect|score <model> <images-dir>");
  process.exit(1);
}
const rows: Row[] = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"));
const cachePath = path.join(dir, `raw-${model.replace(/[^a-z0-9]+/gi, "_")}${process.env.PRESETS ? "-presets" : ""}.json`);

async function detect() {
  const { pipeline, env, RawImage } = await import("@huggingface/transformers");
  env.cacheDir = process.env.HF_CACHE ?? "/tmp/hfcache";
  const detector = await pipeline("zero-shot-object-detection", model, { dtype: (process.env.DTYPE ?? "q8") as "q8" });
  const out: Cached[] = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : [];
  const done = new Set(out.map((c) => c.file));
  for (const row of rows) {
    if (done.has(row.file)) continue;
    const image = await RawImage.read(path.join(dir, row.file));
    const started = Date.now();
    // PRESETS=1 asks with the phrases the app uses; otherwise the plain noun.
    // Grounding DINO expects each phrase to end with a period, one per call.
    const phrases = process.env.PRESETS ? queriesFor(row.noun) : [queryFor(row.noun)];
    const result: { score: number; label: string; box: Detection["box"] }[] = [];
    for (const phrase of phrases) {
      const label = /grounding/i.test(model) ? `${phrase}.` : phrase;
      result.push(...((await detector(image, [label], { threshold: 0.03, topk: 200 } as never)) as unknown as typeof result));
    }
    out.push({ file: row.file, width: image.width, height: image.height, dets: result.map((r) => ({ score: r.score, label: r.label, box: r.box })) });
    console.log(`${row.file} n=${row.n} raw=${result.length} ${Date.now() - started}ms`);
    writeFileSync(cachePath, JSON.stringify(out));
  }
}

function evaluate(cache: Map<string, Cached>, subset: Row[], s: CountSettings) {
  let exact = 0;
  let within1 = 0;
  let absErr = 0;
  for (const row of subset) {
    const c = cache.get(row.file)!;
    const { count } = countDetections(c.dets, c.width, c.height, s);
    if (count === row.n) exact++;
    if (Math.abs(count - row.n) <= 1) within1++;
    absErr += Math.abs(count - row.n);
  }
  const k = Math.max(1, subset.length);
  return { exact: exact / k, within1: within1 / k, mae: absErr / k };
}

function score() {
  const cache = new Map((JSON.parse(readFileSync(cachePath, "utf8")) as Cached[]).map((c) => [c.file, c]));
  // PHYSICAL=1 leaves out drawings and symbols (icons, patterns, text boxes),
  // which nobody brings to a donation drive.
  const abstract = /icon|pattern|text box|silhouette|banner|sticker|hexagon|diamond|heart|star|moon|print|photo/i;
  const usable = rows.filter((r) => cache.has(r.file) && !(process.env.PHYSICAL && abstract.test(r.noun)));
  const tune = usable.filter((_, i) => i % 2 === 0);
  const test = usable.filter((_, i) => i % 2 === 1);
  let best: { s: CountSettings; r: ReturnType<typeof evaluate> } | null = null;
  for (const minScore of [0.03, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.35]) {
    for (const relScore of [0, 0.2, 0.3, 0.4, 0.5, 0.6]) {
      for (const iouT of [0.3, 0.4, 0.5, 0.6]) {
        for (const gap of [0, 0.4, 0.5, 0.6]) {
          const s = { minScore, relScore, iou: iouT, gap };
          const r = evaluate(cache, tune, s);
          if (!best || r.exact + r.within1 * 0.5 - r.mae * 0.05 > best.r.exact + best.r.within1 * 0.5 - best.r.mae * 0.05) best = { s, r };
        }
      }
    }
  }
  const held = evaluate(cache, test, best!.s);
  const all = evaluate(cache, usable, best!.s);
  console.log(JSON.stringify({ model, images: usable.length, settings: best!.s, tuneSet: best!.r, heldOut: held, all }, null, 1));
  if (process.env.SHOW) {
    for (const row of usable) {
      const c = cache.get(row.file)!;
      const { count, confidence, crowded } = countDetections(c.dets, c.width, c.height, best!.s);
      const mark = count === row.n ? "ok " : Math.abs(count - row.n) <= 1 ? "~  " : "MISS";
      console.log(`${mark} ${row.file} ${row.noun.padEnd(16)} truth=${row.n} got=${count} ${confidence}${crowded ? " crowded" : ""}`);
    }
  }
}

// SETTINGS='{"minScore":0.1,...}' scores fixed settings instead of tuning,
// so settings tuned on one set can be checked on another.
function fixed() {
  const s = JSON.parse(process.env.SETTINGS ?? "{}") as CountSettings;
  const cache = new Map((JSON.parse(readFileSync(cachePath, "utf8")) as Cached[]).map((c) => [c.file, c]));
  const usable = rows.filter((r) => cache.has(r.file));
  console.log(JSON.stringify({ model, settings: s, all: evaluate(cache, usable, s) }));
  for (const row of usable) {
    const c = cache.get(row.file)!;
    const res = countDetections(c.dets, c.width, c.height, s);
    const mark = res.count === row.n ? "ok " : Math.abs(res.count - row.n) <= 1 ? "~  " : "MISS";
    console.log(`${mark} ${row.file} ${row.noun.padEnd(22)} truth=${row.n} got=${res.count} ${res.confidence}${res.crowded ? " crowded" : ""}`);
    if (process.env.BOXES && (mark === "MISS" || process.env.BOXES === "all")) {
      const ia = c.width * c.height;
      for (const d of res.kept) {
        const b = d.box;
        console.log(
          `     ${d.score.toFixed(3)} x=${Math.round(b.xmin)}-${Math.round(b.xmax)} y=${Math.round(b.ymin)}-${Math.round(b.ymax)} area=${(((b.xmax - b.xmin) * (b.ymax - b.ymin)) / ia).toFixed(3)} aspect=${((b.xmax - b.xmin) / Math.max(1, b.ymax - b.ymin)).toFixed(2)}`,
        );
      }
    }
  }
}

if (mode === "fixed") {
  fixed();
} else if (mode === "detect") {
  detect().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  score();
}
