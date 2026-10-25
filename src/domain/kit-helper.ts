// Kit, the helper for a need. Kit reads the need's own numbers (views,
// people helping, what's confirmed, days left) and turns them into plain
// advice and ready-to-send drafts: Instagram captions, emails and partner
// ideas. It's written rules, not a language model, so it never makes up
// facts: every number it says comes from the need itself.

import type { Category } from "./types";
import { formatCalendarDate } from "./dates";
import { countNoun, formatCount, listPhrase, pluralize } from "./text";

export interface KitInput {
  orgName: string;
  title: string;
  category: Category;
  unitName: string;
  city: string;
  target: number;
  accepted: number;
  promised: number;
  available: number;
  activeDrives: number;
  helperGroups: string[];
  neededBy: string;
  daysLeft: number;
  passed: boolean;
  views: number | null;
  viewsLast7: number[];
  // What goes in one kit, e.g. "2 cans of soup". Empty for a single item.
  items: string[];
  need: string;
  updatesCount: number;
  daysSinceUpdate: number | null;
  url: string;
  // "organization" when the person asking runs the need, "group" when they run a drive for it.
  asker: "organization" | "group";
  askerName: string;
}

export type KitIntent = "why" | "instagram" | "partners" | "email" | "stats";

export interface KitTip {
  tone: "fix" | "good";
  title: string;
  detail: string;
  next?: KitIntent;
  link?: { href: string; label: string };
}

export interface Draft {
  id: string;
  label: string;
  text: string;
}

export interface EmailDraft {
  id: string;
  label: string;
  who: string;
  subject: string;
  body: string;
}

export interface PartnerIdea {
  id: string;
  title: string;
  why: string;
  emailId?: string;
}

const units = (n: number, unit: string) => countNoun(n, unit).toLowerCase();
const plural = (unit: string) => pluralize(unit).toLowerCase();

export function greeting(hour: number, name: string): string {
  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const first = name.split(" ")[0];
  return first ? `${part}, ${first}.` : `${part}.`;
}

/** One or two sentences Kit opens with: the most useful thing to know today. */
export function briefing(k: KitInput): string {
  const left = k.available;
  if (k.passed && k.accepted < k.target) {
    return `The needed-by date for ${k.title.toLowerCase()} has passed with ${units(k.target - k.accepted, k.unitName)} not yet confirmed. Want help deciding what to do next?`;
  }
  if (left === 0) {
    return `Every ${k.unitName.toLowerCase()} is promised. ${formatCount(k.accepted)} of ${formatCount(k.target)} are confirmed so far. A thank-you post now helps the next need.`;
  }
  const seen = k.views === null ? "" : k.views === 0 ? "Nobody has opened the page yet. " : `${formatCount(k.views)} ${k.views === 1 ? "person has" : "people have"} opened the page. `;
  const helping = k.activeDrives === 0 ? "No group has offered to help yet" : `${countNoun(k.activeDrives, "group")} ${k.activeDrives === 1 ? "is" : "are"} helping`;
  const time = k.daysLeft <= 0 ? "" : ` with ${countNoun(k.daysLeft, "day")} to go`;
  return `${seen}${helping}, and ${units(left, k.unitName)} still need someone${time}.`;
}

/** Why a need isn't getting help, worst problem first. Always returns at least one tip. */
export function diagnose(k: KitInput): KitTip[] {
  const tips: KitTip[] = [];
  const views = k.views ?? 0;
  const lowReach = views < 25;
  if (k.available > 0 && lowReach) {
    tips.push({
      tone: "fix",
      title: "Not many people have seen it",
      detail: `${views === 0 ? "No one has" : `Only ${formatCount(views)} ${views === 1 ? "person has" : "people have"}`} opened the page. People can't help with a need they haven't seen. One post where your neighbors already are (Instagram, a group chat, a school announcement) usually does more than anything else.`,
      next: "instagram",
    });
  }
  if (k.available > 0 && !lowReach && k.activeDrives === 0) {
    const chunk = suggestedChunk(k.available);
    tips.push({
      tone: "fix",
      title: "People look, but nobody has offered yet",
      detail: `${formatCount(views)} people opened it and none started helping. ${units(k.available, k.unitName)} can feel like too much for one family or club. Ask for ${units(chunk, k.unitName)} at a time in your post, so it feels doable.`,
      next: "instagram",
    });
  }
  if (k.available > 0 && !k.passed && k.daysLeft <= 7) {
    tips.push({
      tone: "fix",
      title: `Only ${countNoun(Math.max(k.daysLeft, 0), "day")} left`,
      detail: `Say the date out loud in every post and email. People act on a deadline they can see.${k.helperGroups.length > 0 ? " The groups already helping are your fastest bet: ask if they can take a few more." : ""}`,
      next: k.helperGroups.length > 0 ? "email" : "instagram",
    });
  }
  if (k.need.trim().length < 80) {
    tips.push({
      tone: "fix",
      title: "Say who it helps",
      detail: `The "Why it's needed" part is short. One real sentence ("Kids at our pantry go home Friday with nothing for the weekend") gives people a reason to choose your need.`,
    });
  }
  if (k.items.length >= 5) {
    tips.push({
      tone: "fix",
      title: "A long list feels like homework",
      detail: `Each ${k.unitName.toLowerCase()} has ${k.items.length} different things. Ask a store or a club to cover one item each, so nobody has to shop the whole list.`,
      next: "partners",
    });
  }
  if (k.updatesCount === 0 || (k.daysSinceUpdate !== null && k.daysSinceUpdate > 14)) {
    tips.push({
      tone: "fix",
      title: k.updatesCount === 0 ? "No updates yet" : "It's been quiet for a while",
      detail: `A short update ("More ${plural(k.unitName)} came in this week. Thank you!") shows the need is real and moving. People like to join something that's already working.`,
    });
  }
  if (k.accepted > 0 && k.available > 0) {
    tips.push({
      tone: "good",
      title: `${units(k.accepted, k.unitName)} already confirmed`,
      detail: "That's proof it works. Lead with it in your next post.",
      next: "instagram",
    });
  }
  if (k.available === 0) {
    tips.push({
      tone: "good",
      title: "Everything is promised",
      detail: "Nothing to fix. Thank the people helping in public, and they'll come back for the next need.",
      next: "instagram",
    });
  }
  if (tips.length === 0) {
    tips.push({
      tone: "good",
      title: "Things look healthy",
      detail: "People are seeing it and groups are helping. Keep posting once or twice a week until the date.",
      next: "instagram",
    });
  }
  return tips;
}

/** A size of ask that feels doable: about a quarter of what's left, rounded to a friendly number. */
export function suggestedChunk(available: number): number {
  if (available <= 5) return available;
  const quarter = available / 4;
  const step = quarter >= 50 ? 10 : 5;
  return Math.max(step, Math.round(quarter / step) * step);
}

const CATEGORY_TAG: Record<Category, string> = {
  school_supplies: "SchoolSupplies",
  hygiene: "Hygiene",
  winter: "CoatDrive",
  baby: "BabyItems",
  food: "FoodDrive",
  seniors: "Seniors",
  pets: "AdoptDontShop",
  other: "GiveLocal",
};

function hashtags(k: KitInput): string {
  const city = k.city.split(",")[0].replace(/[^A-Za-z0-9]/g, "");
  return ["#" + CATEGORY_TAG[k.category], city ? `#${city}` : "", "#DonateLocal", "#KitGap"].filter(Boolean).join(" ");
}

/** Captions for Instagram and Facebook. The post image carries a QR code, so captions point to it. */
export function instagramDrafts(k: KitInput): Draft[] {
  const left = k.available;
  const date = formatCalendarDate(k.neededBy);
  const list = k.items.length > 0 ? `\n\nIn each ${k.unitName.toLowerCase()}:\n${k.items.map((i) => `• ${i}`).join("\n")}` : "";
  const how = "\n\nScan the code in the picture (or the link in our bio) to say what you'll bring. We confirm everything that arrives, so you'll see it counted.";
  const drafts: Draft[] = [];

  if (left === 0) {
    drafts.push({
      id: "thanks",
      label: "Thank-you post",
      text: `Thank you! Every one of our ${units(k.target, k.unitName)} is now promised${k.helperGroups.length > 0 ? `, thanks to ${listPhrase(k.helperGroups.slice(0, 3))}` : ""}. ${formatCount(k.accepted)} have already arrived and been checked in.\n\nThis is what a neighborhood looks like. 💚\n\n${hashtags(k)}`,
    });
  }
  if (left > 0) {
    const chunk = suggestedChunk(left);
    drafts.push({
      id: "ask",
      label: "Clear ask",
      text: `${k.orgName} needs ${units(left, k.unitName)} by ${date}.${list}${how}\n\nCan't do ${formatCount(left)}? Even ${formatCount(chunk)} helps.\n\n${hashtags(k)}`,
    });
    drafts.push({
      id: "story",
      label: "Why it matters",
      text: `${firstSentence(k.need) || `Our neighbors are counting on these ${plural(k.unitName)}.`}\n\nWe still need ${units(left, k.unitName)} by ${date}.${how}\n\n${hashtags(k)}`,
    });
  }
  if (left > 0 && k.accepted > 0) {
    drafts.push({
      id: "progress",
      label: "Progress so far",
      text: `${formatCount(k.accepted)} down, ${formatCount(k.target - k.accepted)} to go! 📦\n\nThanks to everyone who brought ${plural(k.unitName)} so far. We still need ${units(left, k.unitName)} by ${date}.${how}\n\n${hashtags(k)}`,
    });
  }
  if (left > 0 && !k.passed && k.daysLeft <= 7) {
    drafts.unshift({
      id: "urgent",
      label: "Last call",
      text: `⏰ ${countNoun(Math.max(k.daysLeft, 0), "day")} left. ${k.orgName} still needs ${units(left, k.unitName)} by ${date}.${list}${how}\n\nPlease share this with one friend.\n\n${hashtags(k)}`,
    });
  }
  return drafts;
}

function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const match = t.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : t).trim();
}

interface PartnerType {
  id: string;
  title: string;
  why: string;
  who: string;
}

const PARTNERS: Record<Category, PartnerType[]> = {
  food: [
    { id: "grocery", title: "A local grocery store", why: "Many will put a donation bin by the door, or give a discount on a bulk order.", who: "the store manager" },
    { id: "faith", title: "A church, mosque or temple", why: "Congregations collect food every week and already have volunteers.", who: "the outreach team" },
    { id: "club", title: "A high school service club", why: "Key Club, NHS and Interact members need service hours and love a clear goal.", who: "the club advisor" },
  ],
  school_supplies: [
    { id: "office", title: "An office supply store", why: "Stores often match drives or donate leftover back-to-school stock.", who: "the store manager" },
    { id: "pta", title: "A PTA at another school", why: "Parents shop for supplies anyway and can add one extra pack.", who: "the PTA president" },
    { id: "club", title: "A high school service club", why: "Members need service hours and can run a collection week.", who: "the club advisor" },
  ],
  seniors: [
    { id: "club", title: "A high school service club", why: "Students can bring the kits and stay for a visit, which residents often value most.", who: "the club advisor" },
    { id: "pharmacy", title: "A pharmacy", why: "Lotion, socks and other care items are on their shelves already.", who: "the store manager" },
    { id: "library", title: "The public library", why: "Libraries give away large-print books and puzzles and can host a drop-off box.", who: "the branch manager" },
  ],
  pets: [
    { id: "petstore", title: "A pet store", why: "Many run a \"buy one for the shelter\" bin at checkout.", who: "the store manager" },
    { id: "vet", title: "A vet clinic", why: "Clinics see pet owners every day and can put up your QR code poster.", who: "the office manager" },
    { id: "club", title: "A 4-H or school club", why: "Animal-loving students can run a collection and help at adoption days.", who: "the club advisor" },
  ],
  hygiene: [
    { id: "pharmacy", title: "A pharmacy", why: "Travel-size items and toothbrushes are cheap in bulk.", who: "the store manager" },
    { id: "dentist", title: "A dentist's office", why: "Dentists often give away toothbrushes and toothpaste.", who: "the office manager" },
    { id: "hotel", title: "A hotel", why: "Hotels have unopened soaps and shampoos they can donate.", who: "the general manager" },
  ],
  winter: [
    { id: "cleaner", title: "A dry cleaner", why: "Many clean donated coats for free during coat drives.", who: "the owner" },
    { id: "faith", title: "A church, mosque or temple", why: "Congregations can collect coats in one weekend.", who: "the outreach team" },
    { id: "club", title: "A high school service club", why: "Students outgrow coats every year.", who: "the club advisor" },
  ],
  baby: [
    { id: "pediatric", title: "A pediatric office", why: "Families who can give are already in the waiting room.", who: "the office manager" },
    { id: "parents", title: "A parents' group", why: "Parents have outgrown clothes and know exactly what's useful.", who: "the group organizer" },
    { id: "faith", title: "A church, mosque or temple", why: "Many run baby showers for families in need.", who: "the outreach team" },
  ],
  other: [
    { id: "rotary", title: "A Rotary or Lions club", why: "Service clubs look for local projects with a clear goal.", who: "the club president" },
    { id: "business", title: "A local business", why: "A drop-off box by the register reaches hundreds of people a week.", who: "the owner" },
    { id: "club", title: "A high school service club", why: "Members need service hours and like a clear goal.", who: "the club advisor" },
  ],
};

export function partnerIdeas(k: KitInput, nearbyOrgs: string[]): PartnerIdea[] {
  const ideas: PartnerIdea[] = [];
  if (k.helperGroups.length > 0) {
    ideas.push({
      id: "helpers",
      title: `Ask ${listPhrase(k.helperGroups.slice(0, 2))} to bring a friend`,
      why: "The people already helping are the easiest to ask. They trust you and know how it works.",
      emailId: "helpers",
    });
  }
  for (const org of nearbyOrgs.slice(0, 2)) {
    ideas.push({
      id: `org-${org}`,
      title: `Team up with ${org}`,
      why: "They're collecting the same kind of thing nearby. One shared post reaches both your followers.",
      emailId: "neighbor-org",
    });
  }
  for (const p of PARTNERS[k.category]) ideas.push({ id: p.id, title: p.title, why: p.why, emailId: p.id });
  return ideas;
}

export function emailDrafts(k: KitInput, nearbyOrgs: string[]): EmailDraft[] {
  const left = k.available;
  const date = formatCalendarDate(k.neededBy);
  const what = left > 0 ? units(left, k.unitName) : plural(k.unitName);
  const list = k.items.length > 0 ? `\n\nEach ${k.unitName.toLowerCase()} has ${listPhrase(k.items)}.` : "";
  const link = `\n\nEverything is listed here, and you can see what's already been confirmed: ${k.url}`;
  const sign = `\n\nThank you,\n${k.askerName}\n${k.asker === "organization" ? k.orgName : `helping ${k.orgName}`}`;
  const emails: EmailDraft[] = [];

  if (k.helperGroups.length > 0) {
    emails.push({
      id: "helpers",
      label: "To the groups already helping",
      who: "the groups already helping",
      subject: `Could you help with a few more ${plural(k.unitName)}?`,
      body: `Hi,\n\nThank you for helping with ${k.title.toLowerCase()}. It's making a real difference.\n\nWe still need ${what} by ${date}. Would your group be able to take on a few more, or ask one other group you know?${link}${sign}`,
    });
  }
  if (nearbyOrgs.length > 0) {
    emails.push({
      id: "neighbor-org",
      label: `To ${nearbyOrgs[0]}`,
      who: nearbyOrgs[0],
      subject: "Team up on one post?",
      body: `Hi,\n\nI saw you're collecting in our area too. We're working on ${k.title.toLowerCase()} for ${k.orgName} and still need ${what} by ${date}.\n\nWould you like to share each other's needs this week? One post from each of us would reach both groups of followers.${link}${sign}`,
    });
  }
  for (const p of PARTNERS[k.category]) {
    emails.push({
      id: p.id,
      label: `To ${p.title.replace(/^An? /, "a ").replace(/^The /, "the ")}`,
      who: p.who,
      subject: `Can you help ${k.orgName} collect ${plural(k.unitName)}?`,
      body: `Hi,\n\nI'm writing from ${k.asker === "organization" ? k.orgName : `a group helping ${k.orgName}`}${k.city ? ` in ${k.city.split(",")[0]}` : ""}. We need ${what} by ${date}.${list}\n\n${partnerAsk(p.id)}${link}${sign}`,
    });
  }
  return emails;
}

function partnerAsk(id: string): string {
  switch (id) {
    case "grocery":
    case "petstore":
    case "office":
    case "pharmacy":
    case "business":
      return "Would you be willing to put a donation box near the register for two weeks, or offer a small discount if we buy in bulk? We'd thank you by name in our posts.";
    case "club":
      return "Would your club like to take on part of it as a service project? Members can count it toward service hours, and they'll see exactly what was confirmed when it arrives.";
    case "faith":
      return "Would your community be willing to collect for one weekend? We can bring a box and pick it up afterwards.";
    case "library":
      return "Could the library host a drop-off box, or share large-print books or puzzles you're giving away?";
    case "vet":
    case "dentist":
    case "pediatric":
      return "Could you put up a small poster with our QR code in your waiting room, or donate any extras you have?";
    case "hotel":
      return "Would you be able to donate unopened toiletries you no longer use?";
    case "cleaner":
      return "Would you be willing to clean donated coats, or collect coats at your counter?";
    case "pta":
    case "parents":
      return "Could you share this with your families? Many people can add one extra item when they shop.";
    default:
      return "Would you be willing to help, or share this with people who might?";
  }
}

/** Matches a typed question to what Kit can do. Kit is honest when it doesn't understand. */
export function routeQuestion(text: string): KitIntent | null {
  const t = text.toLowerCase();
  if (/insta|post|caption|social|facebook|tiktok|share|story/.test(t)) return "instagram";
  if (/email|e-mail|mail|letter|write to|message/.test(t)) return "email";
  if (/partner|team|store|business|club|church|who (can|could|should)|sponsor|collab/.test(t)) return "partners";
  if (/stat|view|reach|number|how many|how far|seen|progress/.test(t)) return "stats";
  if (/why|slow|not getting|no one|nobody|few|help|donat|more|stuck|improve|better/.test(t)) return "why";
  return null;
}

// Guardrail for AI-written text: a model must not invent numbers.
/** Numbers Kit is allowed to say: everything in the facts, plus small counting words. */
export function allowedNumbers(facts: unknown, extra: string[] = []): Set<string> {
  const allowed = new Set<string>(["0", "1", "2", "3", "4", "5", "10"]);
  for (const s of [JSON.stringify(facts), ...extra]) for (const m of s.match(/\d+/g) ?? []) allowed.add(String(Number(m)));
  return allowed;
}

/** True when every number in the text is one Kit is allowed to say. Links are ignored. */
export function onlyKnownNumbers(text: string, allowed: Set<string>): boolean {
  const withoutLinks = text.replace(/https?:\/\/\S+/g, "");
  return (withoutLinks.match(/\d[\d,]*/g) ?? []).every((n) => allowed.has(String(Number(n.replace(/,/g, "")))));
}
