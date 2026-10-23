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

  const needList = shortages.map((s) => countNoun(s.quantity, s.name));
  let headline: string;
  if (!isKit) {
    const only = shortages[0];
    headline = `${formatCount(only.quantity)} more ${nounFor(only.quantity, only.name)} ${only.quantity === 1 ? "is" : "are"} needed.`;
  } else if (shortages.length === 1) {
    const only = shortages[0];
    headline = `${formatCount(only.quantity)} more ${nounFor(only.quantity, only.name)} ${only.quantity === 1 ? "completes" : "complete"} the remaining ${remaining}.`;
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
    detail = `No complete ${pluralize(unit).toLowerCase()} can be packed yet: ${listPhrase(limiting)} ${limiting.length === 1 ? "is" : "are"} the limit.`;
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

function nounFor(count: number, name: string): string {
  return (count === 1 ? name.trim() : pluralize(name)).toLowerCase();
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
