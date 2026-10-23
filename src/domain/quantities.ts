// Every quantity KitGap shows is computed here from authoritative records.
// docs/quantity-model.md explains the model with worked examples, and
// tests/unit/quantities.test.ts checks each rule.
//
// Vocabulary (one "unit" is one kit, or one item for a single-item request):
//   committed      units a group has promised (commitment.quantity)
//   accepted       units the receiving organization confirmed and accepted
//   pendingReview  units in deliveries awaiting the organization's decision
//   reserved       units counted against the request while a drive holds them
//   available      units still open for new drives

import type {
  CollectionEntryRecord,
  CommitmentRecord,
  ComponentRecord,
  DeliveryRecord,
  KitMovementRecord,
  PledgeRecord,
  RequestType,
} from "./types";

// ---------------------------------------------------------------------------
// Deliveries

export interface DeliverySums {
  accepted: number;
  notAccepted: number;
  pendingReview: number;
  pendingCount: number;
}

export function sumDeliveries(deliveries: readonly DeliveryRecord[]): DeliverySums {
  const sums: DeliverySums = { accepted: 0, notAccepted: 0, pendingReview: 0, pendingCount: 0 };
  for (const delivery of deliveries) {
    if (delivery.status === "submitted") {
      sums.pendingReview += delivery.quantity;
      sums.pendingCount += 1;
    } else if (delivery.status === "reviewed") {
      sums.accepted += delivery.acceptedQuantity ?? 0;
      sums.notAccepted += delivery.notAcceptedQuantity ?? 0;
    }
    // Cancelled deliveries never count: their units went back to "ready".
  }
  return sums;
}

// ---------------------------------------------------------------------------
// One group's commitment, as the request sees it

export interface CommitmentLedger {
  committed: number;
  accepted: number;
  pendingReview: number;
  // Active drive: everything not yet accepted (committed - accepted).
  // Withdrawn drive: only units still awaiting the organization's review.
  reserved: number;
}

export function commitmentLedger(
  commitment: Pick<CommitmentRecord, "quantity" | "status">,
  deliveries: readonly DeliveryRecord[],
): CommitmentLedger {
  const sums = sumDeliveries(deliveries);
  const reserved =
    commitment.status === "active"
      ? Math.max(0, commitment.quantity - sums.accepted)
      : sums.pendingReview;
  return {
    committed: commitment.quantity,
    accepted: sums.accepted,
    pendingReview: sums.pendingReview,
    reserved,
  };
}

// ---------------------------------------------------------------------------
// The whole request

export interface RequestTotals {
  target: number;
  accepted: number;
  pendingReview: number;
  reserved: number;
  available: number;
  // accepted + reserved: everything that is done or held by a group.
  promised: number;
  // Reserved units not yet handed over (reserved - pendingReview).
  inProgress: number;
  activeDrives: number;
}

export function requestTotals(
  target: number,
  commitments: readonly Pick<CommitmentRecord, "id" | "quantity" | "status">[],
  deliveries: readonly (DeliveryRecord & { commitmentId: string })[],
): RequestTotals {
  const byCommitment = groupBy(deliveries, (d) => d.commitmentId);
  let accepted = 0;
  let reserved = 0;
  let pendingReview = 0;
  let activeDrives = 0;
  for (const commitment of commitments) {
    const ledger = commitmentLedger(commitment, byCommitment.get(commitment.id) ?? []);
    accepted += ledger.accepted;
    reserved += ledger.reserved;
    pendingReview += ledger.pendingReview;
    if (commitment.status === "active") activeDrives += 1;
  }
  const available = Math.max(0, target - accepted - reserved);
  return {
    target,
    accepted,
    pendingReview,
    reserved,
    available,
    promised: accepted + reserved,
    inProgress: Math.max(0, reserved - pendingReview),
    activeDrives,
  };
}

// ---------------------------------------------------------------------------
// Supplies needed for a number of units

export interface SupplyLine {
  componentId: string;
  name: string;
  details: string;
  quantityPerUnit: number;
  total: number;
}

export function supplyList(
  components: readonly Pick<ComponentRecord, "id" | "name" | "details" | "quantityPerUnit" | "position">[],
  units: number,
): SupplyLine[] {
  return [...components]
    .sort((a, b) => a.position - b.position)
    .map((component) => {
      assertPositiveInteger(component.quantityPerUnit, `quantity per unit for ${component.name}`);
      return {
        componentId: component.id,
        name: component.name,
        details: component.details,
        quantityPerUnit: component.quantityPerUnit,
        total: component.quantityPerUnit * units,
      };
    });
}

// The largest number of complete kits the given component totals can make:
// the minimum over components of floor(available / quantityPerKit).
export function maxCompleteUnits(
  components: readonly Pick<ComponentRecord, "id" | "quantityPerUnit">[],
  quantities: ReadonlyMap<string, number>,
): number {
  if (components.length === 0) return 0;
  let max = Number.POSITIVE_INFINITY;
  for (const component of components) {
    assertPositiveInteger(component.quantityPerUnit, "quantity per unit");
    const have = Math.max(0, quantities.get(component.id) ?? 0);
    max = Math.min(max, Math.floor(have / component.quantityPerUnit));
  }
  return max;
}

// ---------------------------------------------------------------------------
// A group's drive workspace

export interface DriveInput {
  requestType: RequestType;
  components: readonly ComponentRecord[];
  commitment: Pick<CommitmentRecord, "id" | "quantity" | "status">;
  pledges: readonly PledgeRecord[];
  collections: readonly CollectionEntryRecord[];
  movements: readonly KitMovementRecord[];
  deliveries: readonly DeliveryRecord[];
}

export interface ComponentProgress {
  componentId: string;
  name: string;
  details: string;
  quantityPerUnit: number;
  // Needed for the whole commitment: quantityPerUnit x committed.
  needed: number;
  // Received and checked as usable (voided entries excluded).
  collected: number;
  // Received but not usable; recorded for transparency, never counted.
  unusable: number;
  // Collected components already inside packed kits.
  inUnits: number;
  // Collected components not yet packed.
  unallocated: number;
  // Promised by contributors and not yet received.
  openPledged: number;
  // Still to collect for the units left to build, before counting pledges.
  stillNeeded: number;
  // Still needed after open pledges: what nobody has offered yet.
  uncovered: number;
  // Collected beyond what the remaining units need.
  surplus: number;
}

export interface UnitStages {
  // Units that exist (kits: packed - unpacked; items: usable items collected).
  built: number;
  // With the group, ready to hand over.
  ready: number;
  pendingReview: number;
  accepted: number;
  // Not accepted by the organization; waiting for repair or to be set aside.
  needsFollowUp: number;
  setAside: number;
  // Units still to pack (kits) or collect (items) to meet the commitment.
  toBuild: number;
  // Units beyond the commitment (possible for items collected in excess).
  surplusUnits: number;
}

export interface DriveProgress {
  requestType: RequestType;
  committed: number;
  active: boolean;
  stages: UnitStages;
  components: ComponentProgress[];
  // Kit drives: complete kits that all usable collected components could make,
  // counting components already packed. Never add this to stages.built.
  supportedByCollected: number;
  // Kit drives: additional kits that the unpacked components can make now.
  packableFromUnallocated: number;
  // What the coordinator can pack now without exceeding the commitment.
  packableNow: number;
  // What can be handed over now without exceeding the commitment.
  deliverableNow: number;
  // Outstanding pledged units by pledge id (quantity - received), open pledges only.
  pledgeOutstanding: Map<string, number>;
  pledgeReceived: Map<string, number>;
}

export function driveProgress(input: DriveInput): DriveProgress {
  const { requestType, components, commitment } = input;
  const active = commitment.status === "active";
  const committed = commitment.quantity;
  const isKit = requestType === "kit";

  const liveCollections = input.collections.filter((entry) => entry.voidedAt === null);
  const collectedBy = new Map<string, number>();
  const unusableBy = new Map<string, number>();
  const receivedByPledge = new Map<string, number>();
  for (const entry of liveCollections) {
    add(collectedBy, entry.componentId, entry.usableQuantity);
    add(unusableBy, entry.componentId, entry.unusableQuantity);
    if (entry.pledgeId) add(receivedByPledge, entry.pledgeId, entry.usableQuantity + entry.unusableQuantity);
  }

  const pledgeOutstanding = new Map<string, number>();
  const openPledgedBy = new Map<string, number>();
  for (const pledge of input.pledges) {
    if (pledge.status !== "open") continue;
    const outstanding = Math.max(0, pledge.quantity - (receivedByPledge.get(pledge.id) ?? 0));
    pledgeOutstanding.set(pledge.id, outstanding);
    add(openPledgedBy, pledge.componentId, outstanding);
  }

  const moved = { packed: 0, unpacked: 0, repaired: 0, set_aside: 0 };
  for (const movement of input.movements) moved[movement.kind] += movement.quantity;

  const deliveries = sumDeliveries(input.deliveries);
  const handedOver = deliveries.pendingReview + deliveries.accepted + deliveries.notAccepted;

  const unitComponent = components[0];
  const built = isKit
    ? moved.packed - moved.unpacked
    : unitComponent
      ? collectedBy.get(unitComponent.id) ?? 0
      : 0;

  const ready = built - handedOver + moved.repaired;
  const needsFollowUp = deliveries.notAccepted - moved.repaired - moved.set_aside;
  const inPipeline = deliveries.accepted + deliveries.pendingReview + ready + needsFollowUp;
  const toBuild = active ? Math.max(0, committed - inPipeline) : 0;
  const surplusUnits = active ? Math.max(0, inPipeline - committed) : Math.max(0, ready);

  const componentProgress: ComponentProgress[] = [...components]
    .sort((a, b) => a.position - b.position)
    .map((component) => {
      const collected = collectedBy.get(component.id) ?? 0;
      const inUnits = isKit ? component.quantityPerUnit * built : collected;
      const unallocated = isKit ? collected - inUnits : 0;
      const neededForRemaining = component.quantityPerUnit * toBuild;
      const stillNeeded = Math.max(0, neededForRemaining - unallocated);
      const openPledged = openPledgedBy.get(component.id) ?? 0;
      return {
        componentId: component.id,
        name: component.name,
        details: component.details,
        quantityPerUnit: component.quantityPerUnit,
        needed: component.quantityPerUnit * committed,
        collected,
        unusable: unusableBy.get(component.id) ?? 0,
        inUnits,
        unallocated,
        openPledged,
        stillNeeded,
        uncovered: Math.max(0, stillNeeded - openPledged),
        surplus: isKit ? Math.max(0, unallocated - neededForRemaining) : 0,
      };
    });

  const supportedByCollected = isKit ? maxCompleteUnits(components, collectedBy) : built;
  const unallocatedBy = new Map(componentProgress.map((c) => [c.componentId, c.unallocated]));
  const packableFromUnallocated = isKit ? maxCompleteUnits(components, unallocatedBy) : 0;
  const packableNow = isKit && active ? Math.min(toBuild, packableFromUnallocated) : 0;
  const deliverableNow = active
    ? Math.max(0, Math.min(ready, committed - deliveries.accepted - deliveries.pendingReview))
    : 0;

  return {
    requestType,
    committed,
    active,
    stages: {
      built,
      ready,
      pendingReview: deliveries.pendingReview,
      accepted: deliveries.accepted,
      needsFollowUp,
      setAside: moved.set_aside,
      toBuild,
      surplusUnits,
    },
    components: componentProgress,
    supportedByCollected,
    packableFromUnallocated,
    packableNow,
    deliverableNow,
    pledgeOutstanding,
    pledgeReceived: receivedByPledge,
  };
}

// The physical-state invariants. Every command is checked against these
// after it is applied; a violation means the command must be rejected.
export function driveInvariantViolations(progress: DriveProgress): string[] {
  const problems: string[] = [];
  const { stages } = progress;
  if (stages.built < 0) problems.push("more kits unpacked than packed");
  if (stages.ready < 0) problems.push("more units handed over than were ready");
  if (stages.needsFollowUp < 0) problems.push("more units repaired or set aside than were returned");
  for (const component of progress.components) {
    if (component.unallocated < 0) {
      problems.push(`${component.name}: packed kits use more than was collected`);
    }
  }
  if (progress.requestType === "kit" && progress.active) {
    const inPipeline = stages.accepted + stages.pendingReview + stages.ready + stages.needsFollowUp;
    if (inPipeline > progress.committed) problems.push("more kits packed than the drive committed to");
  }
  if (stages.accepted + stages.pendingReview > progress.committed) {
    problems.push("more units delivered than the drive committed to");
  }
  return problems;
}

export function requestInvariantViolations(totals: RequestTotals): string[] {
  return totals.accepted + totals.reserved > totals.target
    ? ["accepted and reserved units exceed the request target"]
    : [];
}

// ---------------------------------------------------------------------------

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`Invalid ${label}: ${value}. Recipe quantities must be whole numbers of at least 1.`);
  }
}
