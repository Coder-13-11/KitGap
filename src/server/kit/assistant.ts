import "server-only";

// Kit as a personal assistant across KitGap. A snapshot of what matters to
// this person right now (deliveries to review, drives, their needs' reach,
// deadlines, updates), read fresh from the database each time Kit looks.
// Kit's answers may only use these facts and may only link to these pages.

import { CATEGORIES } from "@/domain/request-input";
import { CATEGORY_LABEL } from "@/domain/phase";
import { suggestedChunk } from "@/domain/kit-helper";
import { countNoun, formatCount } from "@/domain/text";
import { getMyDrives } from "../queries/drives";
import { getMyWorkspaces, getOrgDashboard, type OrgDashboard } from "../queries/organization";
import { listPublicRequests } from "../queries/requests";
import { viewCount } from "../queries/reach";
import type { AppContext } from "../next/context";

export interface Nudge {
  id: string;
  text: string;
  href: string;
  label: string;
  urgency: "now" | "soon" | "info";
}

export interface AssistantLink {
  href: string;
  label: string;
}

export interface AssistantSnapshot {
  signedIn: boolean;
  firstName: string | null;
  nudges: Nudge[];
  // Needs this person runs, for the "Write a post" shortcut.
  myNeeds: { id: string; title: string }[];
  // The need on the current page, when this person runs it.
  pageNeed: { id: string; title: string } | null;
  facts: Record<string, unknown>;
  links: AssistantLink[];
}

const HOW_KITGAP_WORKS = [
  "Local places (food pantries, shelters, schools, senior homes, animal rescues) post a need: exactly what they want, how many, and by when.",
  "Anyone can find a need on Find, filter by kind (food, school, seniors, pets, hygiene, winter, babies) and offer to help with part of it.",
  "A group running a drive invites people, records what arrives, packs kits and reports the handover.",
  "Only what the receiving organization confirms counts as done. A pledge is a promise, not a delivery.",
  "Verified means an organization member confirmed it in KitGap. Recipient means someone at the place signed a one-time receipt link, used for drives people run on their own.",
  "A KitGap reviewer confirms each organization's contact before its needs go public.",
  "Each need has a share kit: a square post picture with a QR code, a caption, and buttons for Instagram, Facebook, WhatsApp and email.",
  "KitGap handles donated goods only, never money.",
  "The app can be installed on a phone from the Get the app page.",
  "The demo is a made-up sample town anyone can try without an account.",
];

const STATIC_LINKS: AssistantLink[] = [
  { href: "/requests", label: "Find a need" },
  { href: "/requests?tab=online", label: "Drives found online" },
  { href: "/about", label: "How KitGap works" },
  { href: "/install", label: "Get the app" },
  { href: "/organization/new", label: "Post a need" },
  ...CATEGORIES.map((c) => ({ href: `/requests?category=${c}`, label: `${CATEGORY_LABEL[c]} needs` })),
];

const ID = /\/requests\/([0-9a-f-]{36})/;

/** Kit's quick read on why a need may be slow, from its reach and helpers. */
function notices(r: OrgDashboard["requests"][number], views: number | null): string[] {
  const left = r.totals?.available ?? 0;
  if (left === 0) return ["Everything is promised. A thank-you post helps the next need."];
  const out: string[] = [];
  const v = views ?? 0;
  const groups = r.totals?.activeDrives ?? 0;
  if (v < 25) out.push(`Few people have seen it (${v} page views). Sharing it is the first fix.`);
  else if (groups === 0) out.push(`${v} people opened it but no group offered yet. ${left} can feel like too much; ask for ${suggestedChunk(left)} at a time.`);
  if (r.deadline && !r.deadline.passed && r.deadline.daysLeft <= 7) out.push(`Only ${r.deadline.daysLeft} days left. Say the date in every post.`);
  if ((r.totals?.accepted ?? 0) > 0) out.push(`${r.totals?.accepted} already confirmed. Lead with that progress.`);
  return out;
}

export async function loadAssistant(ctx: AppContext, path: string): Promise<AssistantSnapshot> {
  const pagePath = path.replace(/^\/demo(?=\/|$)/, "") || "/";
  const nearby = await listPublicRequests(ctx, { status: "open", sort: "deadline" });
  const nearbyFacts = nearby.slice(0, 8).map((s) => ({
    need: s.request.title,
    organization: s.org.name,
    kind: CATEGORY_LABEL[s.request.category],
    city: s.org.city,
    stillNeeded: s.totals.available,
    unit: s.request.unitName,
    daysLeft: Math.max(s.deadline.daysLeft, 0),
    link: `/requests/${s.request.id}`,
  }));
  const links: AssistantLink[] = [...STATIC_LINKS, ...nearby.slice(0, 8).map((s) => ({ href: `/requests/${s.request.id}`, label: s.request.title }))];

  if (!ctx.user) {
    links.push({ href: "/demo", label: "Try the demo" }, { href: "/sign-up", label: "Create an account" }, { href: "/sign-in", label: "Sign in" });
    return {
      signedIn: false,
      firstName: null,
      nudges: [],
      myNeeds: [],
      pageNeed: null,
      links,
      facts: { personAsking: "a visitor who isn't signed in", currentPage: pagePath, howKitGapWorks: HOW_KITGAP_WORKS, openNeedsNearby: nearbyFacts },
    };
  }

  const [{ drives }, workspaces] = await Promise.all([getMyDrives(ctx), getMyWorkspaces(ctx)]);
  const dashboards = (await Promise.all(workspaces.organizations.slice(0, 3).map((o) => getOrgDashboard(ctx, o.id)))).filter(
    (d): d is OrgDashboard => !!d && d !== "not_allowed",
  );
  const published = dashboards.flatMap((d) => d.requests.filter((r) => r.status === "published").map((r) => ({ org: d.org, r })));
  const views = await Promise.all(published.slice(0, 6).map(({ r }) => viewCount(ctx, "request", r.id)));
  const viewsById = new Map(published.slice(0, 6).map(({ r }, i) => [r.id, views[i]]));

  const nudges: Nudge[] = [];
  for (const d of dashboards) {
    for (const p of d.pendingDeliveries.slice(0, 2)) {
      nudges.push({
        id: `review-${p.deliveryId}`,
        urgency: "now",
        text: `${p.groupName} handed over ${countNoun(p.quantity, p.unitName).toLowerCase()} for ${p.requestTitle.toLowerCase()}. Confirm what arrived.`,
        href: `/organization/${d.org.id}#pending`,
        label: "Review it",
      });
    }
  }
  for (const dr of drives.filter((x) => x.status === "active" && x.role === "coordinator")) {
    if (["wait", "done", "withdrawn"].includes(dr.nextStep.action)) continue;
    nudges.push({ id: `drive-${dr.commitmentId}`, urgency: "soon", text: `${dr.requestTitle}: ${dr.nextStep.title}`, href: `/drives/${dr.commitmentId}`, label: "Open your drive" });
  }
  for (const dr of drives.filter((x) => x.status === "active" && x.myOpenPledges > 0 && x.role === "contributor")) {
    nudges.push({ id: `pledge-${dr.commitmentId}`, urgency: "soon", text: `You promised items for ${dr.requestTitle.toLowerCase()}. Drop them off with ${dr.groupName}.`, href: `/drives/${dr.commitmentId}`, label: "See what you promised" });
  }
  for (const { r } of published) {
    const left = r.totals?.available ?? 0;
    const v = viewsById.get(r.id);
    if (left > 0 && r.deadline && !r.deadline.passed && r.deadline.daysLeft <= 7) {
      nudges.push({ id: `due-${r.id}`, urgency: "soon", text: `${r.title}: ${countNoun(r.deadline.daysLeft, "day")} left and ${countNoun(left, r.unitName).toLowerCase()} still open.`, href: `/requests/${r.id}/kit?ask=instagram`, label: "Write a last-call post" });
    } else if (left > 0 && v !== null && v !== undefined && v < 25) {
      nudges.push({ id: `reach-${r.id}`, urgency: "info", text: `Only ${formatCount(v)} ${v === 1 ? "person has" : "people have"} opened ${r.title.toLowerCase()}. A post would help.`, href: `/requests/${r.id}/kit?ask=instagram`, label: "Write a post" });
    }
  }
  if (workspaces.unreadUpdates > 0) {
    nudges.push({ id: `updates-${workspaces.unreadUpdates}`, urgency: "info", text: `You have ${countNoun(workspaces.unreadUpdates, "new update")}.`, href: "/updates", label: "Read updates" });
  }

  const myNeeds = [
    ...published.map(({ r }) => ({ id: r.id, title: r.title })),
    ...drives.filter((d) => d.status === "active").map((d) => ({ id: d.requestId, title: d.requestTitle })),
  ].filter((n, i, all) => all.findIndex((m) => m.id === n.id) === i);
  const pageId = pagePath.match(ID)?.[1] ?? null;
  const pageNeed = myNeeds.find((n) => n.id === pageId) ?? null;

  links.push({ href: "/home", label: "Home" }, { href: "/drives", label: "My giving" }, { href: "/me", label: "Profile" }, { href: "/updates", label: "Updates" });
  for (const d of dashboards) links.push({ href: `/organization/${d.org.id}`, label: d.org.name }, { href: `/organization/${d.org.id}#pending`, label: "Review deliveries" });
  for (const dr of drives) links.push({ href: `/drives/${dr.commitmentId}`, label: `Drive: ${dr.requestTitle}` });
  for (const n of myNeeds) links.push({ href: `/requests/${n.id}`, label: n.title }, { href: `/requests/${n.id}/kit`, label: "Open Kit for this need" }, { href: `/requests/${n.id}/kit?ask=instagram`, label: "Write a post" }, { href: `/requests/${n.id}/kit?ask=email`, label: "Draft emails" }, { href: `/requests/${n.id}/kit?ask=why`, label: "Why it's slow" });

  const facts = {
    personAsking: ctx.user.displayName,
    currentPage: pagePath,
    howKitGapWorks: HOW_KITGAP_WORKS,
    myOrganizations: dashboards.map((d) => ({
      name: d.org.name,
      deliveriesWaitingForMyReview: d.pendingDeliveries.map((p) => ({ group: p.groupName, quantity: p.quantity, unit: p.unitName, need: p.requestTitle })),
      needs: d.requests.map((r) => ({
        title: r.title,
        status: r.status,
        target: r.totals?.target ?? null,
        confirmed: r.totals?.accepted ?? null,
        stillOpen: r.totals?.available ?? null,
        groupsHelping: r.totals?.activeDrives ?? null,
        daysLeft: r.deadline ? Math.max(r.deadline.daysLeft, 0) : null,
        pageViews: viewsById.get(r.id) ?? null,
        whatKitNotices: r.status === "published" ? notices(r, viewsById.get(r.id) ?? null) : [],
        link: `/requests/${r.id}`,
      })),
    })),
    myDrives: drives.map((d) => ({
      need: d.requestTitle,
      organization: d.orgName,
      group: d.groupName,
      myRole: d.role === "coordinator" ? "running the drive" : "member",
      committed: d.quantity,
      confirmed: d.accepted,
      awaitingReview: d.pendingReview,
      unit: d.unitName,
      active: d.status === "active",
      nextStep: d.nextStep.title,
      daysLeft: Math.max(d.deadline.daysLeft, 0),
      link: `/drives/${d.commitmentId}`,
    })),
    newUpdates: workspaces.unreadUpdates,
    isKitGapReviewer: workspaces.isReviewer,
    openNeedsNearby: nearbyFacts,
  };

  return { signedIn: true, firstName: ctx.user.displayName.split(" ")[0] ?? null, nudges, myNeeds, pageNeed, links, facts };
}
