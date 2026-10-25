import "server-only";

// Kit's AI layer. A language model (set with KIT_AI_*; any OpenAI-compatible
// endpoint) turns the need's real facts into friendly answers and drafts.
//
// Guardrails, because a model can make things up:
// - The model only sees facts read from the database (src/server/kit/input.ts).
// - Every number it writes must appear in those facts; a reply or draft with
//   any other number is thrown away and the written rules answer instead.
// - If the model is slow, down or not configured, the rules answer. Kit
//   always works.

import {
  briefing,
  diagnose,
  emailDrafts,
  instagramDrafts,
  type Draft,
  type EmailDraft,
  type KitInput,
  type KitIntent,
  allowedNumbers,
  onlyKnownNumbers,
} from "@/domain/kit-helper";
import { formatCalendarDate } from "@/domain/dates";

const INTENTS: KitIntent[] = ["why", "instagram", "partners", "email", "stats"];
const TIMEOUT_MS = 20_000;

export interface KitReply {
  source: "ai" | "rules";
  text: string;
  intent: KitIntent | null;
  instagram?: Draft[];
  emails?: EmailDraft[];
  next: KitIntent[];
}

export interface KitTurn {
  from: "me" | "kit";
  text: string;
}

export function kitAiEnabled(): boolean {
  return Boolean(process.env.KIT_AI_API_KEY && process.env.KIT_AI_BASE_URL);
}

/** The facts the model may use, as one plain object. */
export function kitFacts(k: KitInput, nearbyOrgs: string[]) {
  return {
    organization: k.orgName,
    need: k.title,
    whyItsNeeded: k.need,
    city: k.city,
    unit: k.unitName,
    eachUnitContains: k.items,
    target: k.target,
    confirmedReceived: k.accepted,
    promisedByGroups: k.promised - k.accepted,
    stillNeedSomeone: k.available,
    groupsHelping: k.helperGroups,
    neededBy: formatCalendarDate(k.neededBy),
    daysLeft: Math.max(k.daysLeft, 0),
    datePassed: k.passed,
    pageViewsTotal: k.views ?? 0,
    pageViewsLast7Days: k.viewsLast7,
    updatesPosted: k.updatesCount,
    daysSinceLastUpdate: k.daysSinceUpdate,
    otherOrganizationsCollectingTheSameNearby: nearbyOrgs.slice(0, 3),
    link: k.url,
    personAsking: k.askerName,
    personAskingIs: k.asker === "organization" ? "staff at the organization" : "running a group drive for this need",
  };
}

/** The answer Kit gives without the model. */
export function rulesReply(k: KitInput, nearbyOrgs: string[], intent: KitIntent | null): KitReply {
  switch (intent) {
    case "why": {
      const tips = diagnose(k);
      const fixes = tips.filter((t) => t.tone === "fix");
      return {
        source: "rules",
        intent,
        text: fixes.length > 0 ? `Here's what I see, most important first. Start with “${fixes[0].title.toLowerCase()}”.` : "Honestly, things look good. Here's what's working.",
        next: ["instagram", "partners", "email"],
      };
    }
    case "instagram":
      return { source: "rules", intent, text: "Here are posts ready to go. Tap Post to Instagram: I'll copy the caption and open your phone's share sheet with the picture.", instagram: instagramDrafts(k), next: ["email", "partners"] };
    case "email":
      return { source: "rules", intent, text: "Here are emails you can send. Open one in your email app, add who it's to, and send.", emails: emailDrafts(k, nearbyOrgs), next: ["partners", "instagram"] };
    case "partners":
      return { source: "rules", intent, text: `These are the people most likely to help with ${k.title.toLowerCase()}. Tap one and I'll write the email.`, next: ["email", "instagram"] };
    case "stats":
      return { source: "rules", intent, text: briefing(k), next: ["why", "instagram"] };
    default:
      return {
        source: "rules",
        intent: null,
        text: "I can't answer that one yet. I'm best at these: why help is slow, Instagram posts, partners, emails and your numbers.",
        next: ["why", "instagram", "partners", "email"],
      };
  }
}

const SYSTEM = `You are Kit, a friendly helper inside KitGap, an app where local places (food pantries, shelters, schools, senior homes, animal rescues) post exactly what they need and neighbors help.
You help the person running one need get more help.

Rules:
- You are Kit: speak in the first person ("I notice"), never about "Kit" in the third person.
- Use ONLY the facts given. Never invent numbers, dates, names, partners, quotes or results. If you don't know, say so.
- Write plainly, like a kind, practical neighbor. Short sentences. No jargon, no hype, no markdown headings or bold. At most 2 emoji in a post, none in emails or replies.
- Speak to the person directly ("you").
- Never promise results ("this will double donations"). Suggest, don't guarantee.
- Instagram captions can't have clickable links: say "scan the code in the picture" or "link in bio". The post picture has a QR code.
- Reply with one JSON object only, no other text.`;

function userPrompt(intent: KitIntent | null, question: string, facts: unknown, ruleTips: string[], starters: string): string {
  const ask =
    intent === "instagram"
      ? `Here are starter captions with the right facts:\n${starters}\n\nRewrite each one so it stops someone scrolling Instagram: open with a short hook line, then the ask. Keep every fact from the starter (numbers, the date, the list of what goes in each one, the smaller "even N helps" ask, and how to help: scan the code in the picture). Use line breaks between parts, proper capital letters, under 600 characters, and end with the starter's hashtags. Keep each starter's label. "reply" is one specific sentence about what makes these posts work for this need. JSON: {"reply": "...", "instagram": [{"label": "...", "text": "..."}], "next": [...]}`
      : intent === "email"
        ? `Here are starter emails with the right facts:\n${starters}\n\nRewrite each one to be warm, specific and easy to say yes to, under 150 words, keeping every fact, the link and the signature. Keep each starter's label and who. "reply" is one specific sentence about who to send them to first and why. JSON: {"reply": "...", "emails": [{"label": "...", "who": "...", "subject": "...", "body": "..."}], "next": [...]}`
        : intent === "why"
          ? `Explain in under 90 words why this need might not be getting enough help and the first thing to do. Base it on these checks: ${ruleTips.join(" | ")}. JSON: {"reply": "...", "next": [...]}`
          : intent === "partners"
            ? `In under 70 words, suggest who nearby could partner on this need and why. JSON: {"reply": "...", "next": [...]}`
            : intent === "stats"
              ? `In under 70 words, explain what the numbers say about this need's reach and progress. JSON: {"reply": "...", "next": [...]}`
              : `Answer the question in under 90 words using only the facts. JSON: {"reply": "...", "next": [...]}`;
  return `Facts:\n${JSON.stringify(facts, null, 1)}\n\nThe person asked: "${question}"\n\n${ask}\n"next" lists up to 3 follow-ups from: ${INTENTS.join(", ")}.`;
}

/** Kit's own fact-checked drafts, which the model rewrites rather than inventing from scratch. */
function starters(intent: KitIntent | null, k: KitInput, nearbyOrgs: string[]): string {
  if (intent === "instagram") return JSON.stringify(instagramDrafts(k).slice(0, 3).map(({ label, text }) => ({ label, text })));
  if (intent === "email") return JSON.stringify(emailDrafts(k, nearbyOrgs).slice(0, 3).map(({ label, who, subject, body }) => ({ label, who, subject, body })));
  return "";
}

export async function callModel(messages: { role: string; content: string }[]): Promise<string | null> {
  const base = process.env.KIT_AI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.KIT_AI_API_KEY;
  if (!base || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.KIT_AI_MODEL || "gemma-4-31b-it",
        messages,
        temperature: 0.6,
        max_tokens: 1400,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function askKit(
  k: KitInput,
  nearbyOrgs: string[],
  question: string,
  intent: KitIntent | null,
  history: KitTurn[],
  useAi = true,
): Promise<KitReply> {
  const fallback = rulesReply(k, nearbyOrgs, intent);
  if (!useAi || !kitAiEnabled()) return fallback;

  const facts = kitFacts(k, nearbyOrgs);
  const tips = diagnose(k).map((t) => `${t.title}: ${t.detail}`);
  const starterText = starters(intent, k, nearbyOrgs);
  const allowed = allowedNumbers(facts, [...tips, starterText]);
  const messages = [
    { role: "system", content: SYSTEM },
    ...history.slice(-6).map((t) => ({ role: t.from === "me" ? "user" : "assistant", content: t.text.slice(0, 1200) })),
    { role: "user", content: userPrompt(intent, question, facts, tips, starterText) },
  ];
  const raw = await callModel(messages);
  const json = raw ? parseJson(raw) : null;
  if (!json) return fallback;

  const text = str(json.reply, 900);
  const next = Array.isArray(json.next) ? (json.next.filter((n) => INTENTS.includes(n as KitIntent)) as KitIntent[]).slice(0, 3) : [];
  const reply: KitReply = {
    source: "ai",
    intent,
    text: text && onlyKnownNumbers(text, allowed) ? text : fallback.text,
    next: next.length > 0 ? next : fallback.next,
  };

  if (intent === "instagram") {
    const drafts = (Array.isArray(json.instagram) ? json.instagram : [])
      .map((d, i) => ({ id: `ai-${i}`, label: str((d as Record<string, unknown>)?.label, 40) || "Draft", text: str((d as Record<string, unknown>)?.text, 2200) }))
      .filter((d) => d.text && onlyKnownNumbers(d.text, allowed))
      .slice(0, 3);
    reply.instagram = drafts.length > 0 ? drafts : fallback.instagram;
    if (drafts.length === 0) reply.source = "rules";
  }
  if (intent === "email") {
    const drafts = (Array.isArray(json.emails) ? json.emails : [])
      .map((d, i) => {
        const e = d as Record<string, unknown>;
        return { id: `ai-${i}`, label: str(e?.label, 60) || "Email", who: str(e?.who, 60), subject: str(e?.subject, 120), body: str(e?.body, 2000) };
      })
      .filter((d) => d.subject && d.body && onlyKnownNumbers(`${d.subject} ${d.body}`, allowed))
      .slice(0, 3);
    reply.emails = drafts.length > 0 ? drafts : fallback.emails;
    if (drafts.length === 0) reply.source = "rules";
  }
  return reply;
}

