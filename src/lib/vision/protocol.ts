import type { Detection } from "./count";

export type WorkerRequest =
  | { type: "load" }
  | { type: "detect"; id: number; image: Blob; phrases: string[]; mode: "count" | "name" };

export type WorkerReply =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready" }
  | { type: "result"; id: number; width: number; height: number; dets: Detection[]; ms: number }
  | { type: "error"; id?: number; message: string };

// Tuned with scripts/vision-eval.ts.
export const COUNT_SETTINGS = { minScore: 0.1, relScore: 0.35, iou: 0.3 } as const;

export const MODEL_DOWNLOAD_MB = 205;
