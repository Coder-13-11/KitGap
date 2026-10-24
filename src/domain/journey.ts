// A contributor's private timeline. Later kit steps describe the drive's shared
// pile. They never claim that one person's items went into a specific kit.

import { kitsStillToConfirm, stillToConfirmSentence } from "./guidance";
import { countNoun, pluralize } from "./text";

export interface JourneyPledge {
  id: string;
  componentName: string;
  quantity: number;
  createdAt: Date;
  contributorName: string | null;
  withdrawn: boolean;
}

export interface JourneyCollection {
  id: string;
  pledgeId: string | null;
  usableQuantity: number;
  createdAt: Date;
  recordedByName: string | null;
  voided: boolean;
}

export interface JourneyMovement {
  id: string;
  kind: "packed" | "unpacked" | "repaired" | "set_aside";
  quantity: number;
  createdAt: Date;
}

export interface JourneyDelivery {
  id: string;
  quantity: number;
  status: "submitted" | "cancelled" | "reviewed";
  submittedAt: Date;
  acceptedQuantity: number | null;
  reviewNote: string;
  reviewedAt: Date | null;
}

export interface JourneyStep {
  id: string;
  at: Date;
  label: "Pledged" | "Recorded as received" | "Kits from this drive" | "Handed over" | "Confirmed";
  title: string;
  detail: string | null;
  note: string | null;
}

export interface DonationJourney {
  steps: JourneyStep[];
  closing: { sentence: string } | null;
}

const LABEL_ORDER: Record<JourneyStep["label"], number> = {
  Pledged: 0,
  "Recorded as received": 1,
  "Kits from this drive": 2,
  "Handed over": 3,
  Confirmed: 4,
};

export function donationJourney(input: {
  unitName: string;
  orgName: string;
  requestTarget: number;
  requestAccepted: number;
  showPersonalNote: boolean;
  pledges: readonly JourneyPledge[];
  collections: readonly JourneyCollection[];
  movements: readonly JourneyMovement[];
  deliveries: readonly JourneyDelivery[];
}): DonationJourney {
  const pledgeIds = new Set(input.pledges.map((p) => p.id));
  const steps: JourneyStep[] = [];

  for (const pledge of input.pledges) {
    const who = pledge.contributorName ? ` from ${pledge.contributorName}` : "";
    steps.push({
      id: `pledge-${pledge.id}`,
      at: pledge.createdAt,
      label: "Pledged",
      title: `${countNoun(pledge.quantity, pledge.componentName)}${who}`,
      detail: pledge.withdrawn
        ? "This pledge was withdrawn. It is not collected."
        : "A pledge is a promise. It is not collected yet.",
      note: null,
    });
  }

  for (const entry of input.collections) {
    if (entry.voided || entry.usableQuantity <= 0 || !entry.pledgeId || !pledgeIds.has(entry.pledgeId)) continue;
    const pledge = input.pledges.find((p) => p.id === entry.pledgeId);
    const item = pledge?.componentName ?? "item";
    const recorded = entry.recordedByName ?? "A coordinator";
    steps.push({
      id: `collected-${entry.id}`,
      at: entry.createdAt,
      label: "Recorded as received",
      title: `${recorded} recorded these ${countNoun(entry.usableQuantity, item)}.`,
      detail: null,
      note: null,
    });
  }

  for (const movement of input.movements) {
    if (movement.kind !== "packed" || movement.quantity <= 0) continue;
    steps.push({
      id: `packed-${movement.id}`,
      at: movement.createdAt,
      label: "Kits from this drive",
      title: `${countNoun(movement.quantity, input.unitName)} packed from the supplies collected.`,
      detail: input.showPersonalNote ? "Your items are not assigned to a specific kit." : null,
      note: null,
    });
  }

  for (const delivery of input.deliveries) {
    if (delivery.status === "cancelled") continue;
    steps.push({
      id: `handed-${delivery.id}`,
      at: delivery.submittedAt,
      label: "Handed over",
      title: `${countNoun(delivery.quantity, input.unitName)} reported to ${input.orgName}.`,
      detail: null,
      note: null,
    });
    const accepted = delivery.status === "reviewed" ? (delivery.acceptedQuantity ?? 0) : 0;
    if (accepted > 0 && delivery.reviewedAt) {
      steps.push({
        id: `confirmed-${delivery.id}`,
        at: delivery.reviewedAt,
        label: "Confirmed",
        title: `${input.orgName} confirmed ${countNoun(accepted, input.unitName)}.`,
        detail: null,
        note: delivery.reviewNote.trim() ? delivery.reviewNote.trim() : null,
      });
    }
  }

  steps.sort((a, b) => a.at.getTime() - b.at.getTime() || LABEL_ORDER[a.label] - LABEL_ORDER[b.label]);

  const confirmed = steps.some((step) => step.label === "Confirmed");
  const remaining = kitsStillToConfirm(input.requestTarget, input.requestAccepted);
  const unit = pluralize(input.unitName).toLowerCase();
  return {
    steps,
    closing: confirmed
      ? {
          sentence:
            remaining === 0
              ? `Every ${unit} on this request has been confirmed by ${input.orgName}.`
              : stillToConfirmSentence(remaining, input.unitName, input.orgName),
        }
      : null,
  };
}
