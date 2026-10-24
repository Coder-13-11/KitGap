import { describe, expect, it } from "vitest";
import { addDays, todayIn } from "@/domain/dates";
import { validateRequestInput } from "@/domain/request-input";
import { inputFromTemplate, REQUEST_TEMPLATES, templateFor } from "@/domain/request-templates";

describe("request templates", () => {
  it("offers the four starting points the onboarding promises", () => {
    expect(REQUEST_TEMPLATES.map((t) => t.label)).toEqual(["School-supply kit", "Hygiene kit", "Emergency kit", "A single item"]);
  });

  it.each(REQUEST_TEMPLATES.map((t) => [t.id, t] as const))("%s is a complete, valid request once a date and place are added", (_id, template) => {
    const at = new Date("2026-10-24T12:00:00Z");
    const input = inputFromTemplate(template, { location: "Kissimmee, FL", neededBy: addDays(todayIn("America/New_York", at), 30) });
    const { errors, value } = validateRequestInput(input, "submit", at);
    expect(errors).toEqual({});
    expect(value.components.length).toBeGreaterThan(0);
  });

  it("ignores unknown template ids and starts blank", () => {
    expect(templateFor("nope")).toBeNull();
    expect(inputFromTemplate(null).title).toBe("");
  });
});
