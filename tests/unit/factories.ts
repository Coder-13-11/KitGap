import type {
  CollectionEntryRecord,
  CommitmentRecord,
  ComponentRecord,
  DeliveryRecord,
  KitMovementRecord,
  PledgeRecord,
} from "@/domain/types";

let counter = 0;
const id = (prefix: string) => `${prefix}-${++counter}`;
const at = new Date("2026-10-23T12:00:00Z");

// The pilot recipe: one backpack, two notebooks, one pencil pack per kit.
export const RECIPE: ComponentRecord[] = [
  { id: "backpack", requestId: "r", position: 0, name: "Backpack", normalizedKey: "backpack", quantityPerUnit: 1, details: "" },
  { id: "notebook", requestId: "r", position: 1, name: "Notebook", normalizedKey: "notebook", quantityPerUnit: 2, details: "" },
  { id: "pencils", requestId: "r", position: 2, name: "Pencil pack", normalizedKey: "pencil pack", quantityPerUnit: 1, details: "" },
];

export function commitment(quantity: number, overrides: Partial<CommitmentRecord> = {}): CommitmentRecord {
  return {
    id: id("c"),
    requestId: "r",
    groupId: id("g"),
    quantity,
    status: "active",
    withdrawnAt: null,
    withdrawNote: "",
    createdBy: "u",
    createdAt: at,
    ...overrides,
  };
}

export function delivery(
  commitmentId: string,
  quantity: number,
  review?: { accepted: number; notAccepted: number },
  status?: DeliveryRecord["status"],
): DeliveryRecord {
  return {
    id: id("d"),
    commitmentId,
    quantity,
    note: "",
    status: status ?? (review ? "reviewed" : "submitted"),
    submittedBy: "u",
    submittedAt: at,
    acceptedQuantity: review ? review.accepted : null,
    notAcceptedQuantity: review ? review.notAccepted : null,
    reviewNote: review && review.notAccepted > 0 ? "Two kits were missing notebooks" : "",
    reviewedAt: review ? at : null,
  };
}

export function collected(
  commitmentId: string,
  componentId: string,
  usable: number,
  options: { unusable?: number; pledgeId?: string; voided?: boolean } = {},
): CollectionEntryRecord {
  return {
    id: id("e"),
    commitmentId,
    componentId,
    pledgeId: options.pledgeId ?? null,
    usableQuantity: usable,
    unusableQuantity: options.unusable ?? 0,
    note: "",
    recordedBy: "u",
    createdAt: at,
    voidedAt: options.voided ? at : null,
  };
}

export function pledge(
  commitmentId: string,
  componentId: string,
  quantity: number,
  status: PledgeRecord["status"] = "open",
): PledgeRecord {
  return {
    id: id("p"),
    commitmentId,
    componentId,
    userId: "contributor",
    guestName: null,
    guestEmail: null,
    importSource: null,
    sourceRowId: null,
    importBatchId: null,
    quantity,
    note: "",
    status,
    closedReason: status === "closed" ? "withdrawn" : null,
    createdAt: at,
  };
}

export function movement(commitmentId: string, kind: KitMovementRecord["kind"], quantity: number): KitMovementRecord {
  return { id: id("m"), commitmentId, kind, quantity, note: "", createdBy: "u", createdAt: at };
}
