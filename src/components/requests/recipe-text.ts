import { countNoun } from "@/domain/text";

export function recipeSummary(
  requestType: "kit" | "item",
  unitName: string,
  components: { name: string; quantityPerUnit: number }[],
): string {
  if (requestType === "item") return `Single item: ${unitName}`;
  return components.map((c) => countNoun(c.quantityPerUnit, c.name)).join(", ");
}
