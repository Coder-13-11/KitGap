// What a request's situation is right now, in plain language. The phase is
// derived from the stored status plus the derived totals and the date, so it
// can never disagree with the numbers shown next to it.

import { isPastDate } from "./dates";
import type { RequestTotals } from "./quantities";
import type { RequestRecord } from "./types";

export type RequestPhase =
  | "draft"
  | "returned" // a reviewer sent the draft back with a note
  | "in_review"
  | "open" // new drives welcome
  | "fully_committed" // every unit is promised, not all received
  | "past_due" // needed-by date passed, not fulfilled
  | "closed" // the organization stopped new drives
  | "fulfilled" // accepted units reached the target
  | "cancelled";

export function requestPhase(
  request: Pick<RequestRecord, "status" | "statusNote" | "neededBy" | "timezone">,
  totals: Pick<RequestTotals, "accepted" | "available" | "target">,
  now: Date = new Date(),
): RequestPhase {
  switch (request.status) {
    case "draft":
      return request.statusNote ? "returned" : "draft";
    case "in_review":
      return "in_review";
    case "cancelled":
      return "cancelled";
    case "closed":
      return totals.accepted >= totals.target ? "fulfilled" : "closed";
    case "published":
      if (totals.accepted >= totals.target) return "fulfilled";
      if (request.neededBy && isPastDate(request.neededBy, request.timezone, now)) return "past_due";
      if (totals.available === 0) return "fully_committed";
      return "open";
  }
}

export const PHASE_LABEL: Record<RequestPhase, string> = {
  draft: "Draft",
  returned: "Returned for changes",
  in_review: "Waiting for KitGap review",
  open: "Open for new drives",
  fully_committed: "Fully committed",
  past_due: "Past needed-by date",
  closed: "Closed to new drives",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export const PHASE_EXPLANATION: Record<RequestPhase, string> = {
  draft: "Only your organization can see this draft.",
  returned: "A KitGap reviewer asked for changes before this can be listed.",
  in_review: "A KitGap reviewer checks new requests before they are listed publicly.",
  open: "Groups can start a drive for any of the remaining quantity.",
  fully_committed:
    "Groups have promised the full quantity. It is not fulfilled until the organization confirms what it received.",
  past_due:
    "The needed-by date has passed, so new drives can't start. Drives already underway can still deliver.",
  closed: "The organization stopped new drives. Drives already underway can still deliver.",
  fulfilled: "The organization confirmed it received the full quantity.",
  cancelled: "The organization cancelled this request.",
};

// Phases whose request appears in the public directory.
export function isPublicPhase(phase: RequestPhase): boolean {
  return !["draft", "returned", "in_review"].includes(phase);
}

export function acceptsNewDrives(phase: RequestPhase): boolean {
  return phase === "open";
}

// Groups may still hand over units and the organization may still review them.
export function acceptsDeliveries(status: RequestRecord["status"]): boolean {
  return status === "published" || status === "closed";
}

export const CATEGORY_LABEL: Record<RequestRecord["category"], string> = {
  school_supplies: "School supplies",
  hygiene: "Hygiene",
  winter: "Winter clothing",
  baby: "Baby and toddler",
  food: "Food (non-perishable)",
  other: "Other",
};
