import { describe, expect, it } from "vitest";
import { DEFAULT_WEBHOOK_QUESTIONS, planImport, tableFromFormAnswers, withSuggestedAnswers } from "@/domain/import";

const notebooks = { id: "n1", name: "Notebook", normalizedKey: "notebook" };

describe("form webhook answers", () => {
  it("turns a Google Forms payload into the same plan as a CSV row", () => {
    const { table, mapping } = tableFromFormAnswers(DEFAULT_WEBHOOK_QUESTIONS, {
      "Your name": "Ana Sample",
      "What will you bring?": "Notebooks",
      "How many?": "6",
      "Email Address": "ana.sample@example.com",
      "Anything else?": "Friday",
    });
    const ready = withSuggestedAnswers(mapping, table, [notebooks]);
    const plan = planImport({
      table,
      mapping: ready,
      components: [notebooks],
      uncovered: new Map([["n1", 40]]),
      existing: new Set(),
    });
    expect(plan.create).toEqual([
      expect.objectContaining({ guestName: "Ana S.", quantity: 6, componentId: "n1", guestEmail: "ana.sample@example.com", note: "Friday" }),
    ]);
  });

  it("matches question titles without caring about case", () => {
    const { table } = tableFromFormAnswers(DEFAULT_WEBHOOK_QUESTIONS, { "your name": "Ben", "what will you bring?": "Notebooks", "how many?": "2" });
    expect(table.rows[0][0]).toBe("Ben");
    expect(table.rows[0][2]).toBe("2");
  });
});
