"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection } from "./count";
import type { WorkerReply, WorkerRequest } from "./protocol";

export type DetectorStatus = "idle" | "loading" | "ready" | "error";

export interface DetectResult {
  width: number;
  height: number;
  dets: Detection[];
  ms: number;
}

// A first guess at one model pass on a laptop, until we've timed this device.
const FIRST_PASS_MS = 10_000;

// One shared worker for the page. The model downloads once and the browser
// keeps it, so later visits start in a second or two.
export function useDetector() {
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, { passes: number; resolve: (r: DetectResult) => void; reject: (e: Error) => void }>());
  const nextId = useRef(1);
  const passMs = useRef(FIRST_PASS_MS);
  const [status, setStatus] = useState<DetectorStatus>("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensure = useCallback(() => {
    if (worker.current) return worker.current;
    // A classic worker: Turbopack's worker loader starts chunks with importScripts.
    const w = new Worker(new URL("./detector.worker.ts", import.meta.url));
    w.onmessage = (event: MessageEvent<WorkerReply>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        setProgress({ loaded: msg.loaded, total: msg.total });
      } else if (msg.type === "ready") {
        setStatus("ready");
      } else if (msg.type === "result") {
        const job = pending.current.get(msg.id);
        if (job) passMs.current = msg.ms / job.passes;
        job?.resolve(msg);
        pending.current.delete(msg.id);
      } else if (msg.type === "error") {
        setError(msg.message);
        if (msg.id !== undefined) {
          pending.current.get(msg.id)?.reject(new Error(msg.message));
          pending.current.delete(msg.id);
        } else {
          setStatus("error");
        }
      }
    };
    w.onerror = (event) => {
      setStatus("error");
      setError(event.message ? `The counter couldn't start: ${event.message}` : "The counter couldn't start in this browser.");
    };
    w.postMessage({ type: "load" } satisfies WorkerRequest);
    worker.current = w;
    return w;
  }, []);

  const warmUp = useCallback(() => {
    if (status === "loading" || status === "ready") return;
    setStatus("loading");
    setError(null);
    ensure();
  }, [ensure, status]);

  const detect = useCallback(
    (image: Blob, phrases: string[], mode: "count" | "name" = "count") => {
      if (status !== "ready") setStatus("loading");
      const id = nextId.current++;
      const passes = mode === "count" ? phrases.length : 1;
      return new Promise<DetectResult>((resolve, reject) => {
        pending.current.set(id, { passes, resolve, reject });
        ensure().postMessage({ type: "detect", id, image, phrases, mode } satisfies WorkerRequest);
      });
    },
    [ensure, status],
  );

  // Seconds a count with this many passes should take on this device.
  const estimate = useCallback((passes: number) => Math.max(2, Math.round((passMs.current * passes) / 1000)), []);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  return { status, progress, error, warmUp, detect, estimate };
}

// Phone photos can be 12 megapixels. The model looks at about 800 pixels
// anyway, so shrink first: faster to send, same count. Photos that are
// already small go through untouched, because re-saving them changes the count.
export async function preparePhoto(file: Blob, maxSide = 1280): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  // createImageBitmap applies the photo's rotation, so boxes line up.
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  if (scale === 1) {
    bitmap.close();
    return { blob: file, url: URL.createObjectURL(file), width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.95),
  );
  return { blob, url: URL.createObjectURL(blob), width, height };
}
