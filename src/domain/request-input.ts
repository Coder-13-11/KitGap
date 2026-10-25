// Validation for the request form. The same function runs in the browser
// (instant feedback) and on the server (the check that actually counts).

import { addDays, isValidDateString, isValidTimezone, todayIn } from "./dates";
import { normalizeItemKey } from "./text";
import type { Category, RequestType } from "./types";

export const CATEGORIES: Category[] = ["food", "school_supplies", "seniors", "pets", "hygiene", "winter", "baby", "other"];
export const MAX_COMPONENTS = 20;
export const MAX_TARGET = 100_000;

export interface ComponentInput {
  name: string;
  quantityPerUnit: string | number;
  details: string;
}

export interface RequestInput {
  title: string;
  need: string;
  beneficiaries: string;
  category: string;
  requestType: string;
  unitName: string;
  targetQuantity: string | number;
  components: ComponentInput[];
  conditionNotes: string;
  substitutions: string;
  neededBy: string;
  timezone: string;
  location: string;
  handoverInstructions: string;
  coordinatorContact: string;
  fundraisingUrl: string;
}

export interface CleanComponent {
  name: string;
  normalizedKey: string;
  quantityPerUnit: number;
  details: string;
}

export interface CleanRequest {
  title: string;
  need: string;
  beneficiaries: string;
  category: Category;
  requestType: RequestType;
  unitName: string;
  targetQuantity: number | null;
  components: CleanComponent[];
  conditionNotes: string;
  substitutions: string;
  neededBy: string | null;
  timezone: string;
  location: string;
  handoverInstructions: string;
  coordinatorContact: string;
  fundraisingUrl: string | null;
}

export type RequestFieldErrors = Record<string, string>;

export const EMPTY_REQUEST_INPUT: RequestInput = {
  title: "",
  need: "",
  beneficiaries: "",
  category: "school_supplies",
  requestType: "kit",
  unitName: "kit",
  targetQuantity: "",
  components: [{ name: "", quantityPerUnit: "1", details: "" }],
  conditionNotes: "",
  substitutions: "",
  neededBy: "",
  timezone: "America/New_York",
  location: "",
  handoverInstructions: "",
  coordinatorContact: "",
  fundraisingUrl: "",
};

// The steps of the form, and which fields each step owns. Used to send the
// person back to the step that holds an error.
export const REQUEST_STEPS = [
  { key: "basics", title: "About the need", fields: ["title", "need", "beneficiaries", "category"] },
  {
    key: "items",
    title: "What's needed",
    fields: ["requestType", "unitName", "targetQuantity", "components", "conditionNotes", "substitutions"],
  },
  {
    key: "handover",
    title: "When and where",
    fields: ["neededBy", "timezone", "location", "handoverInstructions", "coordinatorContact", "fundraisingUrl"],
  },
  { key: "review", title: "Review", fields: [] },
] as const;

export function stepForField(field: string): number {
  const name = field.startsWith("components") ? "components" : field;
  const index = REQUEST_STEPS.findIndex((step) => (step.fields as readonly string[]).includes(name));
  return index === -1 ? 0 : index;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseWholeNumber(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : text(value).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

// Only https links to a real-looking host are allowed, so a link can never
// run script (javascript:), embed data (data:) or point at an insecure page.
export function checkExternalUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter a full web address starting with https://";
  }
  if (url.protocol !== "https:") return "The link must start with https://";
  if (url.username || url.password) return "The link can't include a username or password";
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return "Enter a full web address, like https://example.org/give";
  return null;
}

export function validateRequestInput(
  input: RequestInput,
  mode: "draft" | "submit",
  now: Date = new Date(),
): { value: CleanRequest; errors: RequestFieldErrors } {
  const errors: RequestFieldErrors = {};
  const complete = mode === "submit";

  const title = text(input.title);
  if (title.length < 5) errors.title = "Enter a title of at least 5 characters";
  else if (title.length > 140) errors.title = "Keep the title to 140 characters or fewer";

  const need = text(input.need);
  if (complete && need.length < 20) errors.need = "Explain the need in at least 20 characters";
  else if (need.length > 2000) errors.need = "Keep this to 2,000 characters or fewer";

  const beneficiaries = text(input.beneficiaries);
  if (complete && beneficiaries.length < 5) {
    errors.beneficiaries = "Describe who this helps in general terms";
  } else if (beneficiaries.length > 500) errors.beneficiaries = "Keep this to 500 characters or fewer";

  const category = CATEGORIES.includes(input.category as Category) ? (input.category as Category) : null;
  if (!category) errors.category = "Choose a category";

  const requestType: RequestType | null =
    input.requestType === "kit" || input.requestType === "item" ? input.requestType : null;
  if (!requestType) errors.requestType = "Choose complete kits or a single item";

  let unitName = text(input.unitName);
  if (requestType === "kit" && !unitName) unitName = "kit";
  if (!unitName) {
    if (complete || requestType === "item") errors.unitName = "Name the item, for example “Composition notebook”";
  } else if (unitName.length > 60) errors.unitName = "Keep the name to 60 characters or fewer";

  const target = parseWholeNumber(input.targetQuantity);
  const targetRaw = text(String(input.targetQuantity ?? ""));
  if (target === null) {
    if (complete || targetRaw) errors.targetQuantity = "Enter a whole number, like 100";
  } else if (target < 1) errors.targetQuantity = "The quantity must be at least 1";
  else if (target > MAX_TARGET) errors.targetQuantity = "The quantity must be 100,000 or fewer";

  const components: CleanComponent[] = [];
  if (requestType === "item") {
    const details = text(input.components?.[0]?.details);
    if (details.length > 300) errors["components.0.details"] = "Keep the description to 300 characters or fewer";
    if (unitName) {
      components.push({ name: unitName, normalizedKey: normalizeItemKey(unitName), quantityPerUnit: 1, details });
    }
  } else if (requestType === "kit") {
    // A row with no name and no details is an unused blank line, whatever its quantity.
    const rows = (input.components ?? []).filter((row) => text(row.name) || text(row.details));
    if (rows.length === 0 && complete) errors.components = "Add at least one item to the kit";
    if (rows.length > MAX_COMPONENTS) errors.components = `A kit can list up to ${MAX_COMPONENTS} items`;
    const seen = new Map<string, number>();
    (input.components ?? []).forEach((row, index) => {
      const name = text(row.name);
      const details = text(row.details);
      if (!name && !details) return;
      if (!name) {
        errors[`components.${index}.name`] = "Name this item";
        return;
      }
      if (name.length > 80) errors[`components.${index}.name`] = "Keep the item name to 80 characters or fewer";
      const qty = parseWholeNumber(row.quantityPerUnit);
      if (qty === null || qty < 1) {
        errors[`components.${index}.quantityPerUnit`] = "Enter a whole number of at least 1";
      } else if (qty > 1000) {
        errors[`components.${index}.quantityPerUnit`] = "Enter 1,000 or fewer per kit";
      }
      if (details.length > 300) errors[`components.${index}.details`] = "Keep the description to 300 characters or fewer";
      const key = normalizeItemKey(name);
      const earlier = seen.get(key);
      if (earlier !== undefined) {
        errors[`components.${index}.name`] =
          `“${name}” is already listed as item ${earlier + 1}. Combine them into one line with the total per kit.`;
        return;
      }
      seen.set(key, index);
      if (qty !== null && qty >= 1 && qty <= 1000) {
        components.push({ name, normalizedKey: key, quantityPerUnit: qty, details });
      }
    });
  }

  const conditionNotes = text(input.conditionNotes);
  if (conditionNotes.length > 1000) errors.conditionNotes = "Keep this to 1,000 characters or fewer";
  const substitutions = text(input.substitutions);
  if (substitutions.length > 1000) errors.substitutions = "Keep this to 1,000 characters or fewer";

  const timezone = text(input.timezone) || "America/New_York";
  if (!isValidTimezone(timezone)) errors.timezone = "Choose a timezone";

  const neededByRaw = text(input.neededBy);
  let neededBy: string | null = null;
  if (!neededByRaw) {
    if (complete) errors.neededBy = "Enter the date you need everything by";
  } else if (!isValidDateString(neededByRaw)) {
    errors.neededBy = "Enter a real date";
  } else {
    neededBy = neededByRaw;
    if (complete && !errors.timezone) {
      const today = todayIn(timezone, now);
      if (neededByRaw < today) errors.neededBy = "The needed-by date can't be in the past";
      else if (neededByRaw > addDays(today, 366)) errors.neededBy = "Choose a date within the next year";
    }
  }

  const location = text(input.location);
  if (complete && location.length < 2) errors.location = "Enter a city or region, like “Kissimmee, FL”";
  else if (location.length > 120) errors.location = "Keep this to 120 characters or fewer";

  const handoverInstructions = text(input.handoverInstructions);
  if (handoverInstructions.length > 2000) errors.handoverInstructions = "Keep this to 2,000 characters or fewer";
  const coordinatorContact = text(input.coordinatorContact);
  if (coordinatorContact.length > 300) errors.coordinatorContact = "Keep this to 300 characters or fewer";

  const fundraisingRaw = text(input.fundraisingUrl);
  let fundraisingUrl: string | null = null;
  if (fundraisingRaw) {
    const problem = checkExternalUrl(fundraisingRaw);
    if (problem) errors.fundraisingUrl = problem;
    else if (fundraisingRaw.length > 500) errors.fundraisingUrl = "Keep the link to 500 characters or fewer";
    else fundraisingUrl = new URL(fundraisingRaw).toString();
  }

  return {
    value: {
      title,
      need,
      beneficiaries,
      category: category ?? "other",
      requestType: requestType ?? "kit",
      unitName: unitName || "kit",
      targetQuantity: target !== null && target >= 1 && target <= MAX_TARGET ? target : null,
      components,
      conditionNotes,
      substitutions,
      neededBy,
      timezone,
      location,
      handoverInstructions,
      coordinatorContact,
      fundraisingUrl,
    },
    errors,
  };
}
