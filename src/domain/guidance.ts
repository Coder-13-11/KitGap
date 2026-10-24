// Plain-language explanations of a drive's numbers: what is holding it up and
// what to do next. Every sentence is computed from DriveProgress, so it only
// says "5 more backpacks complete the remaining kits" when that is true.

import type { DriveProgress } from "./quantities";
import { countNoun, formatCount, listPhrase, pluralize } from "./text";

export interface Shortage {
  name: string;
  quantity: number;
}

export interface Bottleneck {
  headline: string;
  detail: string | null;
  shortages: Shortage[];
}

export function describeBottleneck(progress: DriveProgress, unitName: string): Bottleneck {
  const { stages } = progress;
  const unit = unitName;
  const isKit = progress.requestType === "kit";

  if (!progress.active) {
    return { headline: "This drive was withdrawn.", detail: null, shortages: [] };
  }
  if (stages.accepted >= progress.committed) {
    return {
      headline: `All ${countNoun(progress.committed, unit)} were confirmed received.`,
      detail: null,
      shortages: [],
    };
  }

  const shortages = progress.components
    .filter((c) => c.stillNeeded > 0)
    .map((c) => ({ name: c.name, quantity: c.stillNeeded }));

  if (stages.toBuild === 0) {
    const parts: string[] = [];
    if (stages.ready > 0) parts.push(`${countNoun(stages.ready, unit)} ready to hand over`);
    if (stages.pendingReview > 0) parts.push(`${countNoun(stages.pendingReview, unit)} awaiting the organization's review`);
    if (stages.needsFollowUp > 0) parts.push(`${countNoun(stages.needsFollowUp, unit)} not accepted and needing follow-up`);
    return {
      headline: isKit
        ? `Every ${unit.toLowerCase()} for this drive is packed.`
        : `Every ${unit.toLowerCase()} for this drive is collected.`,
      detail: parts.length ? capitalize(listPhrase(parts)) + "." : null,
      shortages: [],
    };
  }

  const remaining = countNoun(stages.toBuild, unit);
  if (shortages.length === 0) {
    return {
      headline: isKit
        ? `You have the supplies to pack the remaining ${remaining}.`
        : `Everything needed is collected.`,
      detail: null,
      shortages,
    };
  }

  const pledgedFor = new Map(progress.components.map((c) => [c.name, Math.min(c.openPledged, c.stillNeeded)]));
  const needList = shortages.map((s) => {
    const pledged = pledgedFor.get(s.name) ?? 0;
    return countNoun(s.quantity, s.name) + (pledged > 0 ? ` (${formatCount(pledged)} pledged)` : "");
  });
  let headline: string;
  if (!isKit) {
    const only = shortages[0];
    const pledged = pledgedFor.get(only.name) ?? 0;
    headline = `${formatCount(only.quantity)} more ${nounFor(only.quantity, only.name)} ${only.quantity === 1 ? "is" : "are"} needed${pledged > 0 ? ` (${formatCount(pledged)} already pledged)` : ""}.`;
  } else if (shortages.length === 1) {
    const only = shortages[0];
    const pledged = pledgedFor.get(only.name) ?? 0;
    headline = `${formatCount(only.quantity)} more ${nounFor(only.quantity, only.name)} ${only.quantity === 1 ? "completes" : "complete"} the remaining ${remaining}${pledged > 0 ? ` (${formatCount(pledged)} already pledged)` : ""}.`;
  } else {
    headline = `To complete the remaining ${remaining}, you still need ${listPhrase(needList)}.`;
  }

  let detail: string | null = null;
  if (isKit && progress.packableNow > 0) {
    detail = `You can pack ${countNoun(progress.packableNow, unit)} now with what you have.`;
  } else if (isKit) {
    const limiting = progress.components
      .filter((c) => Math.floor(c.unallocated / c.quantityPerUnit) === progress.packableFromUnallocated)
      .map((c) => pluralize(c.name).toLowerCase());
    detail = `No complete ${pluralize(unit).toLowerCase()} can be packed yet. Waiting on ${listPhrase(limiting)}.`;
  }
  return { headline, detail, shortages };
}

export type NextStepAction = "follow_up" | "deliver" | "pack" | "record" | "share" | "wait" | "done" | "withdrawn";

export interface NextStep {
  action: NextStepAction;
  title: string;
  detail: string;
}

// The single most useful thing a coordinator can do now.
export function nextStepForCoordinator(progress: DriveProgress, unitName: string, orgName: string): NextStep {
  const { stages } = progress;
  const unit = unitName;
  if (!progress.active) {
    return { action: "withdrawn", title: "This drive was withdrawn", detail: "Nothing else is needed from your group." };
  }
  if (stages.accepted >= progress.committed) {
    return { action: "done", title: "Drive complete", detail: `${orgName} confirmed it received everything. Thank you!` };
  }
  if (stages.needsFollowUp > 0) {
    return {
      action: "follow_up",
      title: `Decide what to do with ${countNoun(stages.needsFollowUp, unit)} not accepted`,
      detail: "Fix them and mark them ready again, or set them aside and replace them.",
    };
  }
  if (progress.deliverableNow > 0) {
    return {
      action: "deliver",
      title: `Hand over ${countNoun(progress.deliverableNow, unit)}`,
      detail: `After you drop them off, report the delivery so ${orgName} can confirm what arrived.`,
    };
  }
  if (progress.packableNow > 0) {
    return {
      action: "pack",
      title: `Pack ${countNoun(progress.packableNow, unit)}`,
      detail: "You have the supplies for these. Record them once they're packed.",
    };
  }
  const openPledged = progress.components.reduce((sum, c) => sum + c.openPledged, 0);
  const uncovered = progress.components.reduce((sum, c) => sum + c.uncovered, 0);
  if (uncovered > 0) {
    return {
      action: "share",
      title: "Ask for the supplies nobody has pledged yet",
      detail: "Share the supply list with your group, and record donations as they arrive.",
    };
  }
  if (openPledged > 0) {
    return {
      action: "record",
      title: "Record supplies as pledges arrive",
      detail: `Everything still needed is pledged. ${countNoun(openPledged, "item")} ${openPledged === 1 ? "is" : "are"} on the way.`,
    };
  }
  if (stages.pendingReview > 0) {
    return {
      action: "wait",
      title: `Waiting for ${orgName}`,
      detail: `${countNoun(stages.pendingReview, unit)} ${stages.pendingReview === 1 ? "is" : "are"} awaiting their review.`,
    };
  }
  return { action: "record", title: "Record supplies as they arrive", detail: "" };
}

export type ChecklistKey = "share" | "pledge" | "collect" | "pack" | "deliver" | "confirm";

export interface ChecklistStep {
  key: ChecklistKey;
  title: string;
  detail: string;
  status: "done" | "current" | "todo";
}

// The whole drive as a short list anyone can follow. Each step is done by its
// own numbers; the first one that isn't done is the current one.
export function driveChecklist(progress: DriveProgress, unitName: string, orgName: string, pledgeCount: number): ChecklistStep[] {
  const { stages, committed } = progress;
  const sum = (pick: (c: DriveProgress["components"][number]) => number) => progress.components.reduce((n, c) => n + pick(c), 0);
  const uncovered = sum((c) => c.uncovered);
  const stillNeeded = sum((c) => c.stillNeeded);
  const collected = sum((c) => c.collected);
  const handedOver = stages.accepted + stages.pendingReview;
  const packed = Math.max(0, committed - stages.toBuild);
  const of = (n: number) => `${formatCount(Math.min(n, committed))} of ${countNoun(committed, unitName)}`;

  const steps: Omit<ChecklistStep, "status">[] = [
    {
      key: "share",
      title: "Tell your group what to bring",
      detail: pledgeCount > 0 || collected > 0 ? "Your group has started." : "Share the invitation link so members can pledge.",
    },
    {
      key: "pledge",
      title: "Get every supply promised",
      detail: uncovered === 0 ? "Nothing is missing a promise." : `${countNoun(uncovered, "item")} nobody has promised yet.`,
    },
    {
      key: "collect",
      title: "Collect the supplies",
      detail: stillNeeded === 0 ? "Everything needed has arrived." : `${countNoun(stillNeeded, "item")} still to arrive.`,
    },
    ...(progress.requestType === "kit"
      ? [{ key: "pack" as const, title: `Pack the ${pluralize(unitName).toLowerCase()}`, detail: `${of(packed)} packed.` }]
      : []),
    { key: "deliver", title: `Hand them to ${orgName}`, detail: `${of(handedOver)} handed over.` },
    { key: "confirm", title: `${orgName} says they arrived`, detail: `${of(stages.accepted)} confirmed.` },
  ];
  const done: Record<ChecklistKey, boolean> = {
    share: pledgeCount > 0 || collected > 0 || uncovered === 0,
    pledge: uncovered === 0,
    collect: stillNeeded === 0,
    pack: stages.toBuild === 0,
    deliver: handedOver >= committed,
    confirm: stages.accepted >= committed,
  };
  let current = progress.active;
  return steps.map((step) => {
    if (done[step.key]) return { ...step, status: "done" };
    const status = current ? "current" : "todo";
    current = false;
    return { ...step, status };
  });
}

/** Kits a receiving organization has not confirmed yet. Pledges and pending deliveries do not reduce this. */
export function kitsStillToConfirm(target: number, accepted: number): number {
  return Math.max(0, target - accepted);
}

export function stillToConfirmSentence(remaining: number, unitName: string, orgName: string): string {
  return `${countNoun(remaining, unitName)} still to be confirmed by ${orgName}.`;
}

export function shareDriveSentence(remaining: number, unitName: string, orgName: string): string {
  if (remaining <= 0) return `This drive is complete: ${orgName} confirmed every ${unitName.toLowerCase()}.`;
  return `Help finish this drive: ${countNoun(remaining, unitName)} still to be confirmed by ${orgName}.`;
}

/** What a single kit contains, from the recipe. Item requests have no kit sentence. */
export function oneKitNeedsSentence(components: readonly { name: string; quantityPerUnit: number }[]): string | null {
  if (components.length === 0) return null;
  const parts = components.map((c) => countNoun(c.quantityPerUnit, c.name));
  return `One kit still needs ${listPhrase(parts)}.`;
}

export function pledgeImpact(
  quantity: number,
  quantityPerUnit: number,
  itemName: string,
  unitName: string,
): { headline: string; detail: string } {
  const detail = "They count only after the coordinator records them and the organization confirms the kits.";
  const per = Math.max(1, quantityPerUnit);
  const units = Math.floor(quantity / per);
  if (units < 1) {
    const headline = unitName.trim().toLowerCase() === "kit" ? "Not enough for a kit yet." : `Not enough for a ${unitName.toLowerCase()} yet.`;
    return { headline, detail };
  }
  const verb = quantity === 1 ? "is" : "are";
  return { headline: `${countNoun(quantity, itemName)} ${verb} enough for ${countNoun(units, unitName)}.`, detail };
}

/** A published request is close to its goal when at least 75% is confirmed and it is not finished. */
export function isCloseToConfirmed(accepted: number, target: number): boolean {
  if (target <= 0 || accepted >= target) return false;
  return accepted / target >= 0.75;
}

const MILESTONES = [100, 50, 10] as const;

export function confirmedMilestone(acceptedKits: number): { count: number; title: string; detail: string } | null {
  const count = MILESTONES.find((milestone) => acceptedKits >= milestone);
  if (!count) return null;
  const title = `${formatCount(count)} kits confirmed`;
  const detail =
    count === 10
      ? "The first milestone is 10 kits a receiving organization has confirmed."
      : `This milestone is ${formatCount(count)} kits a receiving organization has confirmed.`;
  return { count, title, detail };
}

function nounFor(count: number, name: string): string {
  return (count === 1 ? name.trim() : pluralize(name)).toLowerCase();
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
