// The signed-in home: the one thing to do next across everything someone is
// part of, and a short getting-started list for each role.

import type { NextStepAction } from "./guidance";
import { countNoun } from "./text";

export interface HomeDrive {
  commitmentId: string;
  requestTitle: string;
  role: "coordinator" | "contributor";
  active: boolean;
  nextStep: { action: NextStepAction; title: string };
  myOpenPledges: number;
  pledgeCount: number;
  collectedItems: number;
  built: number;
  isKit: boolean;
}

export interface HomeOrg {
  id: string;
  name: string;
  pendingDeliveries: number;
  requests: { status: string }[];
  hasContact: boolean;
}

export interface HomeStep {
  title: string;
  detail: string;
  href: string;
  label: string;
  /** Idle is a rest state: do not dress it as an urgent next action. */
  urgency: "now" | "idle";
}

const WAITING: NextStepAction[] = ["wait", "done", "withdrawn"];

export function homeNextStep(drives: HomeDrive[], orgs: HomeOrg[]): HomeStep {
  const reviewing = orgs.find((o) => o.pendingDeliveries > 0);
  if (reviewing) {
    return {
      title: `Check ${countNoun(reviewing.pendingDeliveries, "delivery")} for ${reviewing.name}`,
      detail: "A group handed over supplies. Confirm what arrived so their drive can count it.",
      href: `/organization/${reviewing.id}#pending`,
      label: "Review deliveries",
      urgency: "now",
    };
  }
  const coordinating = drives.find((d) => d.active && d.role === "coordinator" && !WAITING.includes(d.nextStep.action));
  if (coordinating) {
    return {
      title: coordinating.nextStep.title,
      detail: coordinating.requestTitle,
      href: `/drives/${coordinating.commitmentId}`,
      label: "Open the drive",
      urgency: "now",
    };
  }
  const draft = orgs.find((o) => o.requests.some((r) => r.status === "draft"));
  if (draft) {
    return {
      title: "Finish your draft request",
      detail: `${draft.name} has a request that isn't submitted yet. A KitGap reviewer checks it before it's listed.`,
      href: `/organization/${draft.id}`,
      label: "Open your requests",
      urgency: "now",
    };
  }
  const empty = orgs.find((o) => o.requests.length === 0);
  if (empty) {
    return {
      title: "Post your first request",
      detail: "Start from a template: a school-supply kit, a hygiene kit, an emergency kit, or a single item.",
      href: `/organization/${empty.id}/requests/new`,
      label: "Post a request",
      urgency: "now",
    };
  }
  const pledging = drives.find((d) => d.active && d.role === "contributor" && d.myOpenPledges === 0);
  if (pledging) {
    return {
      title: "Say what you'll bring",
      detail: `Pledge supplies for ${pledging.requestTitle}.`,
      href: `/drives/${pledging.commitmentId}#pledge`,
      label: "Pledge supplies",
      urgency: "now",
    };
  }
  const bringing = drives.find((d) => d.active && d.myOpenPledges > 0);
  if (bringing) {
    return {
      title: `Bring the ${countNoun(bringing.myOpenPledges, "item")} you pledged`,
      detail: `For ${bringing.requestTitle}. Your coordinator records them when they arrive.`,
      href: `/drives/${bringing.commitmentId}`,
      label: "See drop-off details",
      urgency: "now",
    };
  }
  if (drives.length === 0 && orgs.length === 0) {
    return {
      title: "Pick a request and start a drive",
      detail: "Choose how many kits your group can make. KitGap works out the supply list and sets up your group.",
      href: "/requests",
      label: "Find a request",
      urgency: "now",
    };
  }
  if (orgs[0]) {
    return {
      title: "You're all caught up",
      detail: "No deliveries are waiting. Check your request, or post another one when you need more.",
      href: `/organization/${orgs[0].id}`,
      label: "Open your requests",
      urgency: "idle",
    };
  }
  return {
    title: "You're all caught up",
    detail: "Nothing needs you right now. Find another request, or check what's new.",
    href: "/requests",
    label: "Find a request",
    urgency: "idle",
  };
}

export interface StartItem {
  label: string;
  done: boolean;
  href: string;
}

export function orgGettingStarted(org: HomeOrg): StartItem[] {
  const published = org.requests.some((r) => r.status === "published" || r.status === "closed");
  return [
    { label: "Add a contact for KitGap reviewers", done: org.hasContact, href: `/organization/${org.id}/settings` },
    { label: "Post a request", done: org.requests.some((r) => r.status !== "draft"), href: `/organization/${org.id}/requests/new` },
    { label: "Share it once it's approved", done: published, href: `/organization/${org.id}` },
  ];
}

export function coordinatorGettingStarted(drive: HomeDrive): StartItem[] {
  return [
    { label: "Invite your group to pledge", done: drive.pledgeCount > 0, href: `/drives/${drive.commitmentId}#share` },
    { label: "Record the first supplies that arrive", done: drive.collectedItems > 0, href: `/drives/${drive.commitmentId}#record` },
    ...(drive.isKit ? [{ label: "Pack your first kits", done: drive.built > 0, href: `/drives/${drive.commitmentId}#pack` }] : []),
  ];
}
