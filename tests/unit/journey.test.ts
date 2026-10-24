import { describe, expect, it } from "vitest";
import { donationJourney, type JourneyDelivery, type JourneyPledge } from "@/domain/journey";

const at = (iso: string) => new Date(iso);

const pledge = (overrides: Partial<JourneyPledge> = {}): JourneyPledge => ({
  id: "p1",
  componentName: "Notebook",
  quantity: 10,
  createdAt: at("2026-10-23T12:00:00Z"),
  contributorName: null,
  withdrawn: false,
  ...overrides,
});

function journey(extra: {
  pledges?: JourneyPledge[];
  collections?: Parameters<typeof donationJourney>[0]["collections"];
  movements?: Parameters<typeof donationJourney>[0]["movements"];
  deliveries?: JourneyDelivery[];
  requestAccepted?: number;
}) {
  return donationJourney({
    unitName: "kit",
    orgName: "Riverbend Family Center",
    requestTarget: 100,
    requestAccepted: extra.requestAccepted ?? 0,
    showPersonalNote: true,
    pledges: extra.pledges ?? [pledge()],
    collections: extra.collections ?? [],
    movements: extra.movements ?? [],
    deliveries: extra.deliveries ?? [],
  });
}

describe("donation journey", () => {
  it("keeps an uncollected pledge at pledged", () => {
    const result = journey({});
    expect(result.steps.map((s) => s.label)).toEqual(["Pledged"]);
    expect(result.steps[0].detail).toMatch(/promise/i);
    expect(result.closing).toBeNull();
  });

  it("records a pledge as received only when a collection names it", () => {
    const linked = journey({
      collections: [
        { id: "e1", pledgeId: "p1", usableQuantity: 10, createdAt: at("2026-10-23T13:00:00Z"), recordedByName: "Jordan", voided: false },
        { id: "e2", pledgeId: null, usableQuantity: 20, createdAt: at("2026-10-23T14:00:00Z"), recordedByName: "Jordan", voided: false },
        { id: "e3", pledgeId: "other", usableQuantity: 4, createdAt: at("2026-10-23T14:30:00Z"), recordedByName: "Jordan", voided: false },
      ],
    });
    expect(linked.steps.map((s) => s.label)).toEqual(["Pledged", "Recorded as received"]);
    expect(linked.steps[1].title).toBe("Jordan recorded these 10 notebooks.");
    expect(JSON.stringify(linked)).not.toContain("other");
  });

  it("ignores a voided collection", () => {
    const result = journey({
      collections: [
        { id: "e1", pledgeId: "p1", usableQuantity: 10, createdAt: at("2026-10-23T13:00:00Z"), recordedByName: "Jordan", voided: true },
      ],
    });
    expect(result.steps.map((s) => s.label)).toEqual(["Pledged"]);
  });

  it("does not assign packed or accepted kits to the contributor", () => {
    const result = journey({
      collections: [
        { id: "e1", pledgeId: "p1", usableQuantity: 10, createdAt: at("2026-10-23T13:00:00Z"), recordedByName: "Jordan", voided: false },
      ],
      movements: [{ id: "m1", kind: "packed", quantity: 15, createdAt: at("2026-10-23T15:00:00Z") }],
      deliveries: [
        {
          id: "d1",
          quantity: 15,
          status: "reviewed",
          submittedAt: at("2026-10-23T16:00:00Z"),
          acceptedQuantity: 13,
          reviewNote: "Thank you. The pencil packs were missing from 2 kits.",
          reviewedAt: at("2026-10-23T17:00:00Z"),
        },
      ],
      requestAccepted: 13,
    });
    const packed = result.steps.find((s) => s.label === "Kits from this drive");
    expect(packed?.title).toBe("15 kits packed from the supplies collected.");
    expect(packed?.detail).toBe("Your items are not assigned to a specific kit.");
    const confirmed = result.steps.find((s) => s.label === "Confirmed");
    expect(confirmed?.title).toBe("Riverbend Family Center confirmed 13 kits.");
    expect(confirmed?.note).toMatch(/Thank you/);
    expect(result.closing?.sentence).toBe("87 kits still to be confirmed by Riverbend Family Center.");
    expect(result.steps.filter((s) => s.label === "Confirmed")).toHaveLength(1);
  });

  it("does not count a pledge or a pending delivery as confirmed", () => {
    const pending = journey({
      deliveries: [
        {
          id: "d1",
          quantity: 6,
          status: "submitted",
          submittedAt: at("2026-10-23T16:00:00Z"),
          acceptedQuantity: null,
          reviewNote: "",
          reviewedAt: null,
        },
      ],
    });
    expect(pending.steps.map((s) => s.label)).toEqual(["Pledged", "Handed over"]);
    expect(pending.closing).toBeNull();

    const rejected = journey({
      deliveries: [
        {
          id: "d1",
          quantity: 6,
          status: "reviewed",
          submittedAt: at("2026-10-23T16:00:00Z"),
          acceptedQuantity: 0,
          reviewNote: "None arrived.",
          reviewedAt: at("2026-10-23T17:00:00Z"),
        },
      ],
    });
    expect(rejected.steps.some((s) => s.label === "Confirmed")).toBe(false);
  });
});
