// Starting points for a new request. They only prefill the form: every field
// stays editable, the result is saved as a draft, and it still goes through
// review before anyone sees it. Quantities are placeholders to change.

import { EMPTY_REQUEST_INPUT, type RequestInput } from "./request-input";

export interface RequestTemplate {
  id: "school" | "hygiene" | "emergency" | "item";
  label: string;
  summary: string;
  fields: Partial<RequestInput>;
}

export const REQUEST_TEMPLATES: RequestTemplate[] = [
  {
    id: "school",
    label: "School-supply kit",
    summary: "Backpack, notebooks, pencils and more",
    fields: {
      title: "School-supply kits for students",
      need: "Students we serve start the school year without basic supplies. A complete kit means they have what they need on day one.",
      beneficiaries: "Students in grades K–8 we serve",
      category: "school_supplies",
      requestType: "kit",
      unitName: "kit",
      targetQuantity: "50",
      components: [
        { name: "Backpack", quantityPerUnit: "1", details: "New, child size" },
        { name: "Spiral notebook", quantityPerUnit: "2", details: "Wide-ruled, 70 sheets" },
        { name: "Pencil pack", quantityPerUnit: "1", details: "10 sharpened #2 pencils" },
        { name: "Box of crayons", quantityPerUnit: "1", details: "24 count" },
        { name: "Glue stick", quantityPerUnit: "2", details: "" },
      ],
      conditionNotes: "New items only, in original packaging where possible.",
      substitutions: "Any color backpack is fine.",
    },
  },
  {
    id: "hygiene",
    label: "Hygiene kit",
    summary: "Toothbrush, toothpaste, soap, shampoo",
    fields: {
      title: "Hygiene kits for families",
      need: "Families arriving at our program often have no basic hygiene supplies for their first week.",
      beneficiaries: "Families staying with our program",
      category: "hygiene",
      requestType: "kit",
      unitName: "hygiene kit",
      targetQuantity: "50",
      components: [
        { name: "Toothbrush", quantityPerUnit: "1", details: "New, in package" },
        { name: "Toothpaste", quantityPerUnit: "1", details: "Travel size is fine" },
        { name: "Bar of soap", quantityPerUnit: "1", details: "" },
        { name: "Shampoo", quantityPerUnit: "1", details: "Travel size" },
        { name: "Washcloth", quantityPerUnit: "1", details: "" },
        { name: "Gallon zip bag", quantityPerUnit: "1", details: "To hold the kit" },
      ],
      conditionNotes: "New, unopened items only.",
      substitutions: "Body wash instead of bar soap is fine.",
    },
  },
  {
    id: "emergency",
    label: "Emergency kit",
    summary: "Water, flashlight, batteries, first aid",
    fields: {
      title: "Emergency kits for households",
      need: "Households we serve don't have basic supplies ready if they lose power or have to leave home quickly.",
      beneficiaries: "Households in our service area",
      category: "other",
      requestType: "kit",
      unitName: "emergency kit",
      targetQuantity: "25",
      components: [
        { name: "Bottled water", quantityPerUnit: "6", details: "16.9 oz bottles" },
        { name: "Flashlight", quantityPerUnit: "1", details: "LED" },
        { name: "AA battery pack", quantityPerUnit: "1", details: "4 batteries, to fit the flashlight" },
        { name: "First aid kit", quantityPerUnit: "1", details: "Small, sealed" },
        { name: "Emergency blanket", quantityPerUnit: "1", details: "Mylar" },
        { name: "Whistle", quantityPerUnit: "1", details: "" },
      ],
      conditionNotes: "New items only. Water must be sealed and in date.",
      substitutions: "Any LED flashlight that uses AA batteries is fine.",
    },
  },
  {
    id: "item",
    label: "A single item",
    summary: "Coats, diapers, blankets…",
    fields: {
      title: "Winter coats for children",
      need: "Children we serve need warm coats before the cold weather starts.",
      beneficiaries: "Children ages 5–12 we serve",
      category: "winter",
      requestType: "item",
      unitName: "Children's winter coat",
      targetQuantity: "40",
      components: [{ name: "", quantityPerUnit: "1", details: "Sizes 6–14, new or gently used, clean" }],
      conditionNotes: "Clean, no tears, working zippers.",
      substitutions: "",
    },
  },
];

export function templateFor(id: string | null | undefined): RequestTemplate | null {
  return REQUEST_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function inputFromTemplate(template: RequestTemplate | null, base: Partial<RequestInput> = {}): RequestInput {
  return { ...EMPTY_REQUEST_INPUT, ...base, ...(template?.fields ?? {}) };
}
