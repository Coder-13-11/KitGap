/// <reference lib="webworker" />
// Runs the object detector off the main thread so the page stays smooth.
// Everything happens on the device: photos are never uploaded anywhere.

import { AutoModelForZeroShotObjectDetection, AutoProcessor, AutoTokenizer, RawImage, env } from "@huggingface/transformers";
import type { Detection } from "./count";
import { buildPrompt, decode, type TokenizerLike } from "./grounding";
import type { WorkerReply, WorkerRequest } from "./protocol";

const MODEL_ID = "onnx-community/grounding-dino-tiny-ONNX";

declare const self: DedicatedWorkerGlobalScope;
const post = (message: WorkerReply) => self.postMessage(message);

env.allowLocalModels = false;

type Loaded = {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  tokenizer: TokenizerLike;
  model: Awaited<ReturnType<typeof AutoModelForZeroShotObjectDetection.from_pretrained>>;
};

let loading: Promise<Loaded> | null = null;
const files = new Map<string, { loaded: number; total: number }>();

function onProgress(p: { status: string; file?: string; loaded?: number; total?: number }) {
  if (p.status !== "progress" || !p.file || !p.total) return;
  files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
  let loaded = 0;
  let total = 0;
  for (const f of files.values()) {
    loaded += f.loaded;
    total += f.total;
  }
  post({ type: "progress", loaded, total });
}

// The 8-bit model on the CPU is the one whose accuracy we measured. The
// WebGPU builds (fp16, q4f16) were faster but overcounted pencils and rolls.
function load(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const wasm = (env.backends.onnx as { wasm?: { numThreads?: number } }).wasm;
      if (wasm) wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency ?? 2) - 1)) : 1;
      const [processor, tokenizer, model] = await Promise.all([
        AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
        AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
        AutoModelForZeroShotObjectDetection.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm", progress_callback: onProgress }),
      ]);
      return { processor, tokenizer: tokenizer as unknown as TokenizerLike, model };
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "load") {
      await load();
      post({ type: "ready" });
      return;
    }
    const { processor, tokenizer, model } = await load();
    post({ type: "ready" });
    const image = await RawImage.fromBlob(msg.image);
    const started = performance.now();
    // Counting asks one phrase per pass, the way the accuracy was measured.
    // Naming asks all phrases at once so they compete for each box.
    const prompts = msg.mode === "count" ? msg.phrases.map((p) => buildPrompt(tokenizer, [p])) : [buildPrompt(tokenizer, msg.phrases)];
    const dets: Detection[] = [];
    for (const prompt of prompts) {
      const output = await model(await processor(image, prompt.text));
      dets.push(...decode(output.logits, output.pred_boxes, prompt, image.width, image.height, msg.mode));
    }
    post({ type: "result", id: msg.id, width: image.width, height: image.height, dets, ms: Math.round(performance.now() - started) });  } catch (error) {
    post({ type: "error", id: msg.type === "detect" ? msg.id : undefined, message: error instanceof Error ? error.message : String(error) });
  }
};
