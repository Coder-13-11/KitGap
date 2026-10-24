import "server-only";

// Finds donation drives and volunteer sign-ups that live on other sites:
// SignUpGenius sheets, JustServe projects, public Facebook, Instagram and
// LinkedIn posts, Salvation Army and United Way volunteer pages, and more.
//
// Search runs through Exa, a web search engine that indexes public social
// posts. With EXA_API_KEY set it uses Exa's API; without one it uses Exa's
// public no-key endpoint, which is rate limited. Nothing here signs in to any
// social network or reads anything that isn't public.

import {
  buildQueries,
  parseExaText,
  rankAndFilter,
  sameKey,
  type FoundDrive,
  type RawResult,
  type SectionId,
} from "./rank";

export { seasonFor, type FoundDrive, type SectionId } from "./rank";

const EXA_MCP = "https://mcp.exa.ai/mcp";
const EXA_API = "https://api.exa.ai/search";
const TIMEOUT_MS = 15_000;
const CACHE_MS = 6 * 60 * 60 * 1000;

const cache = new Map<string, { at: number; sections: Record<SectionId, Promise<SectionResult>> }>();

const OBJECTIVE =
  "Find pages where a person can sign up to donate items or volunteer for a specific upcoming donation drive: sign-up sheets, " +
  "volunteer project pages, event pages and recent social posts announcing a drive with drop-off details. Exclude news about " +
  "drives that already ended, store product pages and general articles.";

// Exa's free endpoint answers about three searches at a time from one server;
// more than that comes back as "rate limited". Queue everything through here.
const PUBLIC_CONCURRENCY = 3;
let running = 0;
const waiting: (() => void)[] = [];

async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (running >= PUBLIC_CONCURRENCY) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function exaApi(query: string, key: string): Promise<RawResult[]> {
  return withTimeout(async (signal) => {
    const res = await fetch(EXA_API, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({ query, numResults: 8, type: "auto", contents: { highlights: { numSentences: 3 } } }),
    });
    if (!res.ok) throw new Error(`Exa API ${res.status}`);
    const body = (await res.json()) as { results?: { url: string; title?: string; publishedDate?: string; highlights?: string[] }[] };
    return (body.results ?? []).map((r) => ({
      url: r.url,
      title: r.title ?? "",
      text: (r.highlights ?? []).join(" "),
      publishedAt: r.publishedDate ?? null,
    }));
  });
}

async function exaPublic(query: string): Promise<RawResult[]> {
  return withTimeout(async (signal) => {
    const res = await fetch(EXA_MCP, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "web_search_exa", arguments: { query, numResults: 8, objective: OBJECTIVE } },
      }),
    });
    if (!res.ok) throw new Error(`Exa ${res.status}`);
    const raw = await res.text();
    const json = raw
      .split("\n")
      .map((line) => line.replace(/^data:\s*/, ""))
      .find((line) => line.startsWith("{"));
    if (!json) return [];
    const body = JSON.parse(json) as { result?: { content?: { type: string; text: string }[] } };
    return parseExaText((body.result?.content ?? []).map((c) => c.text).join("\n---\n"));
  });
}

export interface SectionResult {
  results: FoundDrive[];
  failed: boolean;
}

async function searchOne(query: string): Promise<RawResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (apiKey) return exaApi(query, apiKey);
  try {
    return await limited(() => exaPublic(query));
  } catch (error) {
    if (!(error instanceof Error && error.message === "Exa 429")) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return limited(() => exaPublic(query));
  }
}

async function runSection(queries: string[], place: string): Promise<SectionResult> {
  const settled = await Promise.allSettled(queries.map(searchOne));
  const raw = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  return { results: rankAndFilter(raw, place), failed: settled.every((s) => s.status === "rejected") };
}

// Starts all three groups at once and hands back their promises, so the page
// can show each group as soon as it's ready. "More" leaves out anything the
// first two groups already show.
export function startDriveSearch(input: { place: string; topic: string }): Record<SectionId, Promise<SectionResult>> {
  const place = input.place.trim().slice(0, 80);
  const topic = input.topic.trim().slice(0, 60);
  const key = `${place.toLowerCase()}|${topic.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.sections;

  const queries = buildQueries(place, topic);
  const signups = runSection(queries.signups, place);
  const social = runSection(queries.social, place);
  const more = Promise.all([runSection(queries.more, place), signups, social]).then(([m, a, b]) => {
    const shown = new Set([...a.results, ...b.results].map((r) => sameKey(r.url)));
    return { ...m, results: m.results.filter((r) => !shown.has(sameKey(r.url))) };
  });
  const sections = { signups, social, more };
  cache.set(key, { at: Date.now(), sections });
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  // A group that failed outright shouldn't be remembered for six hours.
  void Promise.all([signups, social, more]).then((all) => {
    if (all.some((s) => s.failed)) cache.delete(key);
  });
  return sections;
}
