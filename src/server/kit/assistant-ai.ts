import "server-only";

// Kit answering anything about KitGap, as a personal assistant. Same
// guardrails as the per-need helper: facts only from the snapshot, every
// number checked, links only to pages in the snapshot, and written rules
// when the model can't answer.

import { allowedNumbers, onlyKnownNumbers } from "@/domain/kit-helper";
import type { AssistantLink, AssistantSnapshot } from "./assistant";
import { callModel, kitAiEnabled, parseJson, type KitTurn } from "./ai";

export interface AssistantReply {
  source: "ai" | "rules";
  text: string;
  // A shorter version for reading aloud in voice mode.
  speak: string;
  actions: AssistantLink[];
}

const CATEGORY_WORDS: [RegExp, string][] = [
  [/food|pantry|hungry|meal|grocer/, "food"],
  [/school|backpack|notebook|student|supplies/, "school_supplies"],
  [/senior|elder|old|nursing|retire/, "seniors"],
  [/pet|dog|cat|animal|rescue|shelter dog/, "pets"],
  [/hygiene|soap|toothbrush|shampoo|toiletr/, "hygiene"],
  [/coat|winter|cold|jacket|blanket|glove/, "winter"],
  [/baby|diaper|toddler|infant|formula/, "baby"],
];

function link(s: AssistantSnapshot, href: string): AssistantLink | null {
  return s.links.find((l) => l.href === href) ?? null;
}

export function assistantRules(s: AssistantSnapshot, question: string): AssistantReply {
  const q = question.toLowerCase();
  const say = (text: string, actions: (AssistantLink | null)[], speak = text): AssistantReply => ({
    source: "rules",
    text,
    speak,
    actions: actions.filter((a): a is AssistantLink => !!a).slice(0, 3),
  });
  const nudgeLinks = (list: AssistantSnapshot["nudges"]) => list.map((n) => ({ href: n.href, label: n.label }));

  if (/review|deliver|confirm|arriv/.test(q)) {
    const reviews = s.nudges.filter((n) => n.id.startsWith("review-"));
    if (reviews.length > 0) return say(reviews.map((n) => n.text).join(" "), nudgeLinks(reviews));
  }
  if (/post|insta|caption|share|email|social|promot|advertis|spread/.test(q)) {
    const need = s.pageNeed ?? s.myNeeds[0];
    if (need) {
      const kind = /email/.test(q) ? "email" : "instagram";
      return say(`I'll write ${kind === "email" ? "emails" : "posts"} for ${need.title.toLowerCase()} using its real numbers.`, [link(s, `/requests/${need.id}/kit?ask=${kind}`)]);
    }
  }
  if (/why|slow|not getting|nobody|no one|stuck|more help|more donation/.test(q)) {
    const need = s.pageNeed ?? s.myNeeds[0];
    if (need) return say(`Let's look at ${need.title.toLowerCase()} together. I'll check its views, helpers and deadline.`, [link(s, `/requests/${need.id}/kit?ask=why`)]);
  }
  for (const [pattern, category] of CATEGORY_WORDS) {
    if (pattern.test(q)) {
      const l = link(s, `/requests?category=${category}`);
      return say(`Here are the ${l?.label.toLowerCase() ?? "needs"} on KitGap right now.`, [l, link(s, "/requests?tab=online")]);
    }
  }
  if (/next|todo|to do|should i|today|new|update|anything|what's up|whats up|catch me up|summary/.test(q)) {
    if (s.nudges.length === 0) return say("You're all caught up. Nothing is waiting on you right now.", [link(s, "/requests")]);
    const top = s.nudges.slice(0, 3);
    return say(top.map((n) => n.text).join(" "), nudgeLinks(top), top[0].text);
  }
  if (/find|near|help|volunteer|donat|give/.test(q)) return say("Here's everything near you that still needs help.", [link(s, "/requests"), link(s, "/requests?tab=online")]);
  if (/how|what is|what's|verified|work|kitgap|explain/.test(q)) {
    return say(
      "Local places post exactly what they need. People offer to help, collect it and drop it off. Only what the place confirms counts as done.",
      [link(s, "/about"), link(s, "/requests")],
    );
  }
  return say(
    "I can catch you up on what's waiting, find needs near you, and write posts and emails for a need you run. Try asking “what should I do next?”",
    [link(s, "/requests"), ...(s.myNeeds[0] ? [link(s, `/requests/${s.myNeeds[0].id}/kit`)] : [])],
    "I can catch you up, find needs near you, and write posts and emails.",
  );
}

const SYSTEM = `You are Kit, the friendly personal assistant inside KitGap, a community app where local places post exactly what they need and neighbors help.
You help the person with anything on KitGap: what needs their attention, finding needs, running drives, reviewing deliveries, sharing needs, and how the app works.

Rules:
- You are Kit: speak in the first person ("I notice"), never about "Kit" in the third person.
- Use ONLY the facts given. Never invent numbers, names, dates, partners or results. If the facts don't say, say you don't know.
- When asked why a need or drive isn't getting help, explain it from that need's pageViews, groupsHelping, stillOpen, daysLeft and whatKitNotices, then offer the "Why it's slow" or "Write a post" link for it.
- When asked what to do, start with thingsNeedingAttention.
- You can't click or change anything yourself. Point to the right page with "actions" instead.
- Plain, warm, practical. Short sentences. No markdown, no lists with symbols, no emoji.
- "text": under 70 words. "speak": the same answer in under 25 words, for reading aloud.
- "actions": up to 3 buttons, each copied exactly from the allowed links list (href and label).
- Reply with one JSON object only: {"text": "...", "speak": "...", "actions": [{"href": "...", "label": "..."}]}`;

export async function askAssistant(s: AssistantSnapshot, question: string, history: KitTurn[]): Promise<AssistantReply> {
  const fallback = assistantRules(s, question);
  if (!kitAiEnabled()) return fallback;

  const facts = { ...s.facts, thingsNeedingAttention: s.nudges.map((n) => n.text) };
  const allowed = allowedNumbers(facts);
  const raw = await callModel([
    { role: "system", content: SYSTEM },
    ...history.slice(-6).map((t) => ({ role: t.from === "me" ? "user" : "assistant", content: t.text.slice(0, 800) })),
    {
      role: "user",
      content: `Facts:\n${JSON.stringify(facts)}\n\nAllowed links:\n${JSON.stringify(s.links)}\n\nQuestion: "${question}"`,
    },
  ]);
  const json = raw ? parseJson(raw) : null;
  if (!json) return fallback;
  const text = typeof json.text === "string" ? json.text.trim().slice(0, 700) : "";
  const speak = typeof json.speak === "string" ? json.speak.trim().slice(0, 300) : "";
  if (!text || !onlyKnownNumbers(text, allowed)) return fallback;
  const actions = (Array.isArray(json.actions) ? json.actions : [])
    .map((a) => s.links.find((l) => l.href === (a as Record<string, unknown>)?.href))
    .filter((a): a is AssistantLink => !!a)
    .filter((a, i, all) => all.findIndex((b) => b.href === a.href) === i)
    .slice(0, 3);
  return {
    source: "ai",
    text,
    speak: speak && onlyKnownNumbers(speak, allowed) ? speak : text,
    actions: actions.length > 0 ? actions : fallback.actions,
  };
}
