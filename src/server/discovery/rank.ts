// The pure half of Discover: building search queries for the season, and
// cleaning, dating and ranking what comes back. No network calls here.

import { createHash } from "node:crypto";
import { platformFor, type PlatformId } from "@/domain/discovery";

export interface FoundDrive {
  id: string;
  url: string;
  title: string;
  summary: string;
  platform: PlatformId;
  publishedAt: string | null;
  near: boolean;
  // Posted more than two months ago: it may be over.
  stale: boolean;
}

export interface RawResult {
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// What people are collecting at this time of year, used when no topic is picked
// and to steer the Salvation Army query.
export function seasonFor(today: Date): { topic: string; salvationArmy: string } {
  const m = today.getUTCMonth();
  if (m >= 9) return { topic: "holiday toy, coat and food", salvationArmy: "Angel Tree and Red Kettle bell ringing" };
  if (m <= 1) return { topic: "winter coat and food", salvationArmy: "food pantry and shelter" };
  if (m >= 5 && m <= 7) return { topic: "back to school supplies", salvationArmy: "back to school backpack" };
  return { topic: "food and hygiene kit", salvationArmy: "food pantry" };
}

// Results come back in three groups so the first ones can show while the rest
// are still loading.
export type SectionId = "signups" | "social" | "more";

export function buildQueries(place: string, topic: string, today = new Date()): Record<SectionId, string[]> {
  const season = seasonFor(today);
  const subject = topic || season.topic;
  const when = `${MONTHS[today.getUTCMonth()]} ${today.getUTCFullYear()}`;
  const year = today.getUTCFullYear();
  const at = place ? ` ${place}` : "";
  const more = [
    `${subject} donation drive${at} sign up to donate or volunteer ${when}`,
    `${subject} drive${at} event ${when} eventbrite OR facebook events`,
  ];
  const t = subject.toLowerCase();
  if (/toy|holiday/.test(t)) more.push(`Toys for Tots drop off location${at} ${year}`);
  if (/food/.test(t)) more.push(`food bank${at} host a food drive volunteer ${year}`);
  if (/school|backpack/.test(t)) more.push(`school supply drive${at} drop off bins ${year}`);
  if (/coat|winter/.test(t)) more.push(`coat drive${at} drop off locations ${year}`);
  return {
    signups: [
      `signupgenius.com/go ${subject} drive${at} sign up`,
      `justserve.org project ${subject}${at}`,
      `volunteer opportunity ${subject} drive${at} idealist volunteermatch galaxydigital`,
      `Salvation Army${at} ${season.salvationArmy} volunteer sign up ${year}`,
    ],
    social: [
      `site:facebook.com ${subject} drive${at} drop off donations ${year}`,
      `site:instagram.com ${subject} drive${at} collecting donations ${year}`,
      `site:linkedin.com/posts ${subject} drive${at} volunteers donations ${year}`,
      `reddit${at} where to donate ${subject} ${year}`,
    ],
    more,
  };
}

// The public endpoint answers in the MCP format: text blocks of
// "Title: ... / URL: ... / Published: ... / Highlights: ..." separated by "---".
export function parseExaText(text: string): RawResult[] {
  return text
    .split(/\n---\n/)
    .map((block) => {
      const field = (name: string) => block.match(new RegExp(`^${name}: (.*)$`, "m"))?.[1]?.trim() ?? "";
      const highlights = block.split(/^Highlights:\s*$/m)[1] ?? "";
      const published = field("Published");
      return {
        url: field("URL"),
        title: field("Title"),
        text: highlights.replace(/\s+/g, " ").trim(),
        publishedAt: published && published !== "N/A" ? published : null,
      };
    })
    .filter((r) => r.url);
}

const DRIVE_WORDS =
  /\b(drive|donat\w*|collect\w*|volunteer\w*|sign ?up|signup|giveaway|packing|pack\w* event|kits?|supplies|needed|drop[- ]?off|angel tree|toys? for|food bank|pantry|coat|backpack|hygiene)\b/i;
const BLOCKED_HOSTS = /(^|\.)(wikipedia\.org|amazon\.com|pinterest\.\w+|etsy\.com|walmart\.com|target\.com|ebay\.com|exa\.ai)$/i;
// Search pages and help pages, not a drive someone can join.
const GENERIC_PATHS = /^\/(findasignup|login|signin|fb-answers|help|hashtag|explore|blog)(\/|$)|^\/search(\/prototype)?\/?$/i;

export function cleanUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (BLOCKED_HOSTS.test(u.hostname)) return null;
  if (u.pathname === "/" || GENERIC_PATHS.test(u.pathname)) return null;
  const social = /(facebook|instagram|linkedin)\.com$/i.test(u.hostname.replace(/^www\./, ""));
  if (social) u.search = "";
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|hl$|api$|igsh)/i.test(key)) u.searchParams.delete(key);
  }
  u.hash = "";
  return u.toString();
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|·-]\s*(Instagram|Facebook|LinkedIn|SignUpGenius|JustServe)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function isNear(text: string, place: string): boolean {
  if (!place) return false;
  const words = place
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length >= 3 && !/^(the|and|county|city|area|near)$/.test(w));
  const hay = text.toLowerCase();
  return words.some((w) => hay.includes(w));
}

const PLATFORM_RANK: Partial<Record<PlatformId, number>> = {
  signupgenius: 0,
  justserve: 1,
  facebook: 2,
  instagram: 2,
  linkedin: 2,
  volunteer_hub: 3,
  salvation_army: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const IG_EPOCH_MS = BigInt(1314220021721);
const SIXTY_FOUR = BigInt(64);

// Instagram and LinkedIn post IDs carry the time the post was made, which is
// more trustworthy than a crawler's date and fills in posts that have none.
export function postedFromUrl(url: string): string | null {
  const ig = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]{8,14})/);
  if (ig) {
    let id = BigInt(0);
    for (const ch of ig[1]) id = id * SIXTY_FOUR + BigInt(IG_ALPHABET.indexOf(ch));
    const ms = Number((id >> BigInt(23)) + IG_EPOCH_MS);
    if (ms > Date.UTC(2012, 0) && ms < Date.now() + DAY_MS) return new Date(ms).toISOString();
  }
  const li = url.match(/linkedin\.com\/.*?(?:activity[-:])(\d{19})/);
  if (li) {
    const ms = Number(BigInt(li[1]) >> BigInt(22));
    if (ms > Date.UTC(2014, 0) && ms < Date.now() + DAY_MS) return new Date(ms).toISOString();
  }
  return null;
}

export function sameKey(url: string): string {
  const u = new URL(url);
  return `${u.hostname.replace(/^(www|m)\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
}

// A page that only names past years ("Toy Drive 2024") is almost always over.
export function onlyPastYears(text: string, year: number): boolean {
  const years = [...text.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
  return years.length > 0 && years.every((y) => y < year);
}

export function rankAndFilter(raw: RawResult[], place: string, today = new Date()): FoundDrive[] {
  const seen = new Set<string>();
  const out: FoundDrive[] = [];
  const oldest = new Date(today.getTime() - 150 * DAY_MS);
  const staleAfter = new Date(today.getTime() - 60 * DAY_MS);
  for (const r of raw) {
    const url = cleanUrl(r.url);
    if (!url || seen.has(sameKey(url))) continue;
    const title = cleanTitle(r.title);
    if (!title) continue;
    const text = `${title} ${r.text}`;
    if (!DRIVE_WORDS.test(text)) continue;
    const publishedAt = postedFromUrl(url) ?? r.publishedAt;
    const published = publishedAt ? new Date(publishedAt) : null;
    if (published && !Number.isNaN(published.getTime()) && published < oldest) continue;
    if (onlyPastYears(`${title} ${url} ${r.text.slice(0, 300)}`, today.getUTCFullYear())) continue;
    seen.add(sameKey(url));
    const summary = r.text.replace(/^#+\s*/g, "").replace(/\s+/g, " ").trim().slice(0, 260);
    out.push({
      id: createHash("sha256").update(url).digest("hex").slice(0, 16),
      url,
      title,
      summary: summary === title ? "" : summary,
      platform: platformFor(url),
      publishedAt,
      near: isNear(`${text} ${url}`, place),
      stale: Boolean(published && published < staleAfter),
    });
  }
  return out
    .sort((a, b) => {
      if (a.near !== b.near) return a.near ? -1 : 1;
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      const ra = PLATFORM_RANK[a.platform] ?? 5;
      const rb = PLATFORM_RANK[b.platform] ?? 5;
      if (ra !== rb) return ra - rb;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    })
    .slice(0, 36);
}

