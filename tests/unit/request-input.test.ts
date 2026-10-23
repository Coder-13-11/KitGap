import { describe, expect, it } from "vitest";
import { EMPTY_REQUEST_INPUT, stepForField, validateRequestInput, type RequestInput } from "@/domain/request-input";

const NOW = new Date("2026-10-23T12:00:00Z");

function complete(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    ...EMPTY_REQUEST_INPUT,
    title: "School-supply kits",
    need: "Students arriving mid-year need the basic supplies their teachers expect.",
    beneficiaries: "Students in our program",
    targetQuantity: "100",
    components: [
      { name: "Backpack", quantityPerUnit: "1", details: "" },
      { name: "Notebook", quantityPerUnit: "2", details: "" },
      { name: "Pencil pack", quantityPerUnit: "1", details: "" },
    ],
    neededBy: "2026-11-20",
    location: "Kissimmee, FL",
    ...overrides,
  };
}

describe("request form validation", () => {
  it("accepts a complete request and normalizes the recipe", () => {
    const { value, errors } = validateRequestInput(complete(), "submit", NOW);
    expect(errors).toEqual({});
    expect(value.targetQuantity).toBe(100);
    expect(value.components.map((c) => [c.normalizedKey, c.quantityPerUnit])).toEqual([
      ["backpack", 1],
      ["notebook", 2],
      ["pencil pack", 1],
    ]);
  });

  it("lets a first-step draft save with the untouched starter row", () => {
    const { errors } = validateRequestInput({ ...EMPTY_REQUEST_INPUT, title: "Winter coats" }, "draft", NOW);
    expect(errors).toEqual({});
  });

  it("flags duplicate items written differently, but not different items", () => {
    const dup = validateRequestInput(
      complete({ components: [{ name: "Notebook", quantityPerUnit: "2", details: "" }, { name: " notebooks.", quantityPerUnit: "1", details: "" }] }),
      "submit",
      NOW,
    );
    expect(dup.errors["components.1.name"]).toMatch(/already listed as item 1/);
    const different = validateRequestInput(
      complete({ components: [{ name: "Pencil pack", quantityPerUnit: "1", details: "" }, { name: "Pencil", quantityPerUnit: "2", details: "" }] }),
      "submit",
      NOW,
    );
    expect(different.errors).toEqual({});
  });

  it("rejects zero, fractional and oversized quantities", () => {
    for (const bad of ["0", "1.5", "-2", "abc", "100001"]) {
      expect(validateRequestInput(complete({ targetQuantity: bad }), "submit", NOW).errors.targetQuantity).toBeDefined();
    }
    const zeroPerKit = validateRequestInput(complete({ components: [{ name: "Backpack", quantityPerUnit: "0", details: "" }] }), "submit", NOW);
    expect(zeroPerKit.errors["components.0.quantityPerUnit"]).toBeDefined();
  });

  it("checks needed-by dates in the organization's timezone", () => {
    // 2026-10-23 01:00 UTC is still Oct 22 in New York.
    const lateEvening = new Date("2026-10-23T01:00:00Z");
    expect(validateRequestInput(complete({ neededBy: "2026-10-22" }), "submit", lateEvening).errors.neededBy).toBeUndefined();
    expect(validateRequestInput(complete({ neededBy: "2026-10-22" }), "submit", NOW).errors.neededBy).toMatch(/past/);
    expect(validateRequestInput(complete({ neededBy: "2026-02-30" }), "submit", NOW).errors.neededBy).toMatch(/real date/);
    expect(validateRequestInput(complete({ neededBy: "2028-01-01" }), "submit", NOW).errors.neededBy).toMatch(/next year/);
  });

  it("only allows https fundraising links", () => {
    for (const bad of ["javascript:alert(1)", "http://example.org", "data:text/html,x", "https://user:pw@example.org", "example.org", "https://localhost"]) {
      expect(validateRequestInput(complete({ fundraisingUrl: bad }), "submit", NOW).errors.fundraisingUrl).toBeDefined();
    }
    expect(validateRequestInput(complete({ fundraisingUrl: "https://example.org/give" }), "submit", NOW).errors).toEqual({});
  });

  it("builds a single-item request from the item name", () => {
    const { value, errors } = validateRequestInput(
      complete({ requestType: "item", unitName: "Composition notebook", components: [{ name: "", quantityPerUnit: "1", details: "Wide-ruled" }] }),
      "submit",
      NOW,
    );
    expect(errors).toEqual({});
    expect(value.components).toEqual([{ name: "Composition notebook", normalizedKey: "composition notebook", quantityPerUnit: 1, details: "Wide-ruled" }]);
  });

  it("maps fields to the form step that holds them", () => {
    expect(stepForField("title")).toBe(0);
    expect(stepForField("components.3.name")).toBe(1);
    expect(stepForField("fundraisingUrl")).toBe(2);
  });
});
