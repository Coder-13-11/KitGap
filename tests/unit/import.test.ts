import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SKIP,
  detectSource,
  guessMapping,
  matchComponent,
  parseCsv,
  planImport,
  rowFingerprint,
  shortName,
  withSuggestedAnswers,
  type ImportComponent,
} from "@/domain/import";
import { normalizeItemKey } from "@/domain/text";

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "../fixtures", name), "utf8");

const components: ImportComponent[] = ["Backpack", "Notebook", "Pencil pack"].map((name) => ({
  id: name.toLowerCase().replace(/ /g, "-"),
  name,
  normalizedKey: normalizeItemKey(name),
}));
// A 20-kit drive: 20 backpacks, 40 notebooks, 20 pencil packs, nothing pledged yet.
const uncovered = new Map([
  ["backpack", 20],
  ["notebook", 40],
  ["pencil-pack", 20],
]);

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF, a byte-order mark and blank lines", () => {
    const t = parseCsv('\uFEFFName,Note\r\n"Lee, Ana","She said ""hi"""\r\n\r\nBo,\r\n');
    expect(t.headers).toEqual(["Name", "Note"]);
    expect(t.rows).toEqual([
      ["Lee, Ana", 'She said "hi"'],
      ["Bo", ""],
    ]);
  });

  it("reads semicolon and tab separated files", () => {
    expect(parseCsv("a;b\n1;2").rows).toEqual([["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2").rows).toEqual([["1", "2"]]);
  });

  it("keeps line breaks inside quoted answers", () => {
    expect(parseCsv('q\n"line one\nline two"').rows).toEqual([["line one\nline two"]]);
  });
});

describe("detecting the file", () => {
  it("recognises Google Forms and SignUpGenius exports", () => {
    expect(detectSource(parseCsv(fixture("google-forms-sample.csv")).headers)).toBe("google_forms_csv");
    expect(detectSource(parseCsv(fixture("signupgenius-sample.csv")).headers)).toBe("signupgenius_csv");
    expect(detectSource(["Name", "Item", "Count"])).toBe("spreadsheet");
  });

  it("guesses the columns of a Google Forms download", () => {
    const { headers } = parseCsv(fixture("google-forms-sample.csv"));
    const m = guessMapping(headers, components);
    expect(m).toMatchObject({ timestamp: 0, email: 1, name: 2, item: 3, quantity: 4, comments: 5, keepEmails: false });
  });

  it("guesses the columns of a SignUpGenius report", () => {
    const { headers } = parseCsv(fixture("signupgenius-sample.csv"));
    const m = guessMapping(headers, components);
    expect(m).toMatchObject({ item: 4, quantity: 5, firstName: 6, lastName: 7, email: 8, comments: 9 });
  });

  it("treats one question per item as item columns", () => {
    const m = guessMapping(["Timestamp", "Name", "How many notebooks can you bring?", "Backpacks"], components);
    expect(m.item).toBeNull();
    expect(m.quantity).toBeNull();
    expect(m.itemColumns).toEqual({ "2": "notebook", "3": "backpack" });
  });

  it("matches answer text to the drive's items, and refuses to guess", () => {
    expect(matchComponent("Notebooks", components)?.id).toBe("notebook");
    expect(matchComponent("PENCIL PACKS.", components)?.id).toBe("pencil-pack");
    expect(matchComponent("Spiral notebook", components)?.id).toBe("notebook");
    expect(matchComponent("Pencil", components)).toBeNull();
    expect(matchComponent("Glue sticks", components)).toBeNull();
  });
});

describe("privacy", () => {
  it("keeps a first name and last initial only", () => {
    expect(shortName("Ana Sample")).toBe("Ana S.");
    expect(shortName("Maria de la Cruz")).toBe("Maria C.");
    expect(shortName("", "Hana", "sample")).toBe("Hana S.");
    expect(shortName("Gus")).toBe("Gus");
    expect(shortName("  ")).toBe("");
  });
});

describe("planImport", () => {
  const table = parseCsv(fixture("google-forms-sample.csv"));
  const mapping = withSuggestedAnswers(guessMapping(table.headers, components), table, components);

  it("plans pledges and reports duplicates, rows over the cap and rows with problems", () => {
    const plan = planImport({ table, mapping, components, uncovered, existing: new Set() });
    expect(plan.create.map((p) => [p.rowNumber, p.guestName, p.componentId, p.quantity])).toEqual([
      [2, "Ana S.", "notebook", 6],
      [3, "Ben E.", "pencil-pack", 4],
      [4, "Cara T.", "backpack", 2],
      [4, "Cara T.", "notebook", 2],
      [9, "Gus", "pencil-pack", 1],
    ]);
    expect(plan.create.every((p) => p.guestEmail === null)).toBe(true);
    expect(plan.create[0].note).toBe("Can drop off Friday");
    expect(plan.duplicates).toEqual([{ rowNumber: 8, componentId: "notebook", quantity: 6, guestName: "Ana S." }]);
    expect(plan.overCap).toEqual([{ rowNumber: 6, componentId: "backpack", quantity: 30, guestName: "Eli E.", room: 18 }]);
    expect(plan.errors).toEqual([
      { rowNumber: 5, message: "“Glue sticks” isn't matched to an item" },
      { rowNumber: 7, message: "Quantity isn't a number" },
    ]);
  });

  it("skips answers set to “Don't import” and keeps emails only when asked", () => {
    const plan = planImport({
      table,
      mapping: { ...mapping, keepEmails: true, answers: { ...mapping.answers, [normalizeItemKey("Glue sticks")]: SKIP } },
      components,
      uncovered,
      existing: new Set(),
    });
    expect(plan.errors.map((e) => e.rowNumber)).toEqual([7]);
    expect(plan.skipped).toEqual([{ rowNumber: 5, reason: "Set to “Don't import”" }]);
    expect(plan.create[0].guestEmail).toBe("ana.sample@example.com");
  });

  it("never plans a row twice: rows imported before count as duplicates", () => {
    const first = planImport({ table, mapping, components, uncovered, existing: new Set() });
    const again = planImport({ table, mapping, components, uncovered, existing: new Set(first.create.map((p) => p.sourceRowId)) });
    expect(again.create).toEqual([]);
    expect(again.duplicates).toHaveLength(6);
  });

  it("caps each item at what still needs a pledge", () => {
    const plan = planImport({ table, mapping, components, uncovered: new Map([["notebook", 7], ["backpack", 0], ["pencil-pack", 20]]), existing: new Set() });
    expect(plan.create.filter((p) => p.componentId === "notebook").map((p) => p.quantity)).toEqual([6]);
    expect(plan.overCap.map((o) => [o.rowNumber, o.componentId, o.room])).toEqual([
      [4, "backpack", 0],
      [4, "notebook", 1],
      [6, "backpack", 0],
    ]);
  });

  it("reads one-question-per-item forms", () => {
    const wide = parseCsv("Timestamp,Name,How many notebooks?,Backpacks\n1/1/2026,Lu Sample,3,\n1/2/2026,Mo Sample,,1\n1/3/2026,No Sample,,");
    const m = guessMapping(wide.headers, components);
    const plan = planImport({ table: wide, mapping: m, components, uncovered, existing: new Set() });
    expect(plan.create.map((p) => [p.guestName, p.componentId, p.quantity])).toEqual([
      ["Lu S.", "notebook", 3],
      ["Mo S.", "backpack", 1],
    ]);
    expect(plan.skipped).toEqual([{ rowNumber: 4, reason: "No quantities filled in" }]);
  });

  it("gives a row the same identity every time it's downloaded", () => {
    expect(rowFingerprint(["a", " b "])).toBe(rowFingerprint(["a", "b"]));
    expect(rowFingerprint(["a", "b"])).not.toBe(rowFingerprint(["a", "c"]));
    expect(rowFingerprint(["a", "b"])).toMatch(/^[0-9a-f]{16}$/);
  });
});
