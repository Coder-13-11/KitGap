// Plain records as loaded from the database (camelCase). The domain functions
// only ever read these; they never store derived totals.

export type RequestType = "kit" | "item";
export type RequestStatus = "draft" | "in_review" | "published" | "closed" | "cancelled";
export type Category = "school_supplies" | "hygiene" | "winter" | "baby" | "food" | "other";

export interface RequestRecord {
  id: string;
  orgId: string;
  title: string;
  need: string;
  beneficiaries: string;
  category: Category;
  requestType: RequestType;
  unitName: string;
  targetQuantity: number | null; // null only in an unfinished draft
  conditionNotes: string;
  substitutions: string;
  neededBy: string | null; // "YYYY-MM-DD" in the organization's timezone
  timezone: string;
  location: string;
  handoverInstructions: string;
  coordinatorContact: string;
  fundraisingUrl: string | null;
  status: RequestStatus;
  statusNote: string;
  submittedAt: Date | null;
  publishedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentRecord {
  id: string;
  requestId: string;
  position: number;
  name: string;
  normalizedKey: string;
  quantityPerUnit: number;
  details: string;
}

export type CommitmentStatus = "active" | "withdrawn";

export interface CommitmentRecord {
  id: string;
  requestId: string;
  groupId: string;
  quantity: number;
  status: CommitmentStatus;
  withdrawnAt: Date | null;
  withdrawNote: string;
  createdBy: string;
  createdAt: Date;
}

export interface PledgeRecord {
  id: string;
  commitmentId: string;
  componentId: string;
  userId: string;
  quantity: number;
  note: string;
  status: "open" | "closed";
  closedReason: "withdrawn" | "released" | null;
  createdAt: Date;
}

export interface CollectionEntryRecord {
  id: string;
  commitmentId: string;
  componentId: string;
  pledgeId: string | null;
  usableQuantity: number;
  unusableQuantity: number;
  note: string;
  recordedBy: string;
  createdAt: Date;
  voidedAt: Date | null;
}

export type KitMovementKind = "packed" | "unpacked" | "repaired" | "set_aside";

export interface KitMovementRecord {
  id: string;
  commitmentId: string;
  kind: KitMovementKind;
  quantity: number;
  note: string;
  createdBy: string;
  createdAt: Date;
}

export type DeliveryStatus = "submitted" | "cancelled" | "reviewed";

export interface DeliveryRecord {
  id: string;
  commitmentId: string;
  quantity: number;
  note: string;
  status: DeliveryStatus;
  submittedBy: string;
  submittedAt: Date;
  acceptedQuantity: number | null;
  notAcceptedQuantity: number | null;
  reviewNote: string;
  reviewedAt: Date | null;
}
