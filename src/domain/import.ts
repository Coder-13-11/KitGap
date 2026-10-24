// Bringing sign-ups from Google Forms, SignUpGenius or any spreadsheet into a
// drive as pledges. Everything here is pure: the service loads the drive,
// calls planImport, shows the plan as a preview, and later runs it again
// under a lock to create exactly what the coordinator saw.
//
// An imported row is a promise (a pledge), never supplies received.

import { normalizeItemKey } from "./text";

export type ImportSource = "google_forms_csv" | "signupgenius_csv" | "spreadsheet" | "google_forms_webhook";

export const IMPORT_SOURCE_LABEL: Record<ImportSource, string> = {
  google_forms_csv: "Google Forms",
  signupgenius_csv: "SignUpGenius",
  spreadsheet: "a spreadsheet",
  google_forms_webhook: "Google Forms",
};

export const FILE_SOURCES: ImportSource[] = ["google_forms_csv", "signupgenius_csv", "spreadsheet"];

export const IMPORT_LIMITS = { bytes: 1_000_000, rows: 1000, columns: 60 } as const;

// "Don't import" for an answer that isn't one of the drive's items.
export const SKIP = "skip";

// Column roles, by index into the header row. Indexes rather than names
// because forms can repeat a question title.
export interface ImportMapping {
  name: number | null;
  firstName: number | null;
  lastName: number | null;
  email: number | null;
  item: number | null;
  quantity: number | null;
  comments: number | null;
  timestamp: number | null;
  // Forms that ask "How many notebooks?" as its own question: column -> item.
  itemColumns: Record<string, string>;
  // Answer text (normalized) -> component id, or SKIP.
  answers: Record<string, string>;
  // Emails are optional and seen only by the drive's coordinators.
  keepEmails: boolean;
}

export interface ImportComponent {
  id: string;
  name: string;
  normalizedKey: string;
}

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

// CSV ---------------------------------------------------------------------

// RFC 4180, plus what real exports do: a byte-order mark, CRLF or LF, and
// semicolons or tabs instead of commas (Excel in some regions, copy-paste).
export function parseCsv(text: string): CsvTable {
  const src = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(src);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  const [headers = [], ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

function detectDelimiter(src: string): string {
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const outsideQuotes = firstLine.replace(/"[^"]*"/g, "");
  const counts = [",", ";", "\t"].map((d) => [d, outsideQuotes.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

// Detecting the format and columns -------------------------------------------

const ROLE_PATTERNS: { role: Exclude<keyof ImportMapping, "itemColumns" | "answers" | "keepEmails">; pattern: RegExp }[] = [
  { role: "timestamp", pattern: /^(timestamp|submitted( at| on)?|sign ?up date|date signed up|signed up( on)?)$/i },
  { role: "firstName", pattern: /^(first|first name|given name|student first name)$/i },
  { role: "lastName", pattern: /^(last|last name|surname|family name|student last name)$/i },
  { role: "email", pattern: /e-?mail/i },
  { role: "quantity", pattern: /^(qty|quantity|my qty|amount|number|count|how many(\b.*)?|# ?of items)\??$/i },
  { role: "item", pattern: /^(item|items|slot|item name|sign ?up item|what (will|can) you (bring|donate)(\b.*)?|what are you bringing\??|donation|i will bring)\??$/i },
  { role: "comments", pattern: /\b(comments?|notes?|anything else|message|questions?)\b/i },
  { role: "name", pattern: /(^name$|your name|full name|participant|volunteer|student name|donor)/i },
];

export function detectSource(headers: string[]): ImportSource {
  if (headers.some((h) => /^timestamp$/i.test(h))) return "google_forms_csv";
  const joined = headers.join(" ").toLowerCase();
  if (/sign ?up/.test(joined) || (/\bqty\b/.test(joined) && /first name/.test(joined))) return "signupgenius_csv";
  return "spreadsheet";
}

export function guessMapping(headers: string[], components: readonly ImportComponent[]): ImportMapping {
  const mapping: ImportMapping = {
    name: null,
    firstName: null,
    lastName: null,
    email: null,
    item: null,
    quantity: null,
    comments: null,
    timestamp: null,
    itemColumns: {},
    answers: {},
    keepEmails: false,
  };
  const used = new Set<number>();
  // "How many notebooks can you bring?" is the Notebook column, not a
  // general "how many" column.
  const aboutAnItem = new Set(headers.flatMap((h, i) => (matchComponent(h, components) ? [i] : [])));
  for (const { role, pattern } of ROLE_PATTERNS) {
    const index = headers.findIndex((h, i) => !used.has(i) && (role === "item" || !aboutAnItem.has(i)) && pattern.test(h.trim()));
    if (index >= 0) {
      mapping[role] = index;
      used.add(index);
    }
  }
  // No item column: look for one question per item ("Notebooks", "How many
  // pencils can you bring?").
  if (mapping.item === null) {
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const component = matchComponent(h, components);
      if (component) {
        mapping.itemColumns[String(i)] = component.id;
        used.add(i);
      }
    });
  }
  return mapping;
}

// The drive item an answer (or a question) is about, if exactly one fits.
export function matchComponent(text: string, components: readonly ImportComponent[]): ImportComponent | null {
  const key = normalizeItemKey(text);
  if (!key) return null;
  const exact = components.find((c) => c.normalizedKey === key);
  if (exact) return exact;
  const words = ` ${key} `;
  const contained = components.filter((c) => c.normalizedKey && words.includes(` ${c.normalizedKey} `));
  if (contained.length === 1) return contained[0];
  // The longest name wins: "pencil case" over "pencil" in "a pencil case".
  if (contained.length > 1) {
    const sorted = [...contained].sort((a, b) => b.normalizedKey.length - a.normalizedKey.length);
    if (sorted[0].normalizedKey.length > sorted[1].normalizedKey.length) return sorted[0];
  }
  return null;
}

// Google Forms checkbox questions put every ticked answer in one cell,
// separated by commas.
export function splitAnswers(cell: string): string[] {
  return cell
    .split(/\s*[;,]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function answerKey(answer: string): string {
  return normalizeItemKey(answer);
}

// Distinct answers in the item column, with how often each appears and what
// we'd match it to, for the "match answers to items" step.
export function answerOptions(table: CsvTable, mapping: ImportMapping, components: readonly ImportComponent[]) {
  if (mapping.item === null) return [];
  const seen = new Map<string, { key: string; text: string; rows: number; suggested: string | null }>();
  for (const row of table.rows) {
    for (const answer of splitAnswers(row[mapping.item] ?? "")) {
      const key = answerKey(answer);
      if (!key) continue;
      const entry = seen.get(key);
      if (entry) entry.rows++;
      else seen.set(key, { key, text: answer, rows: 1, suggested: matchComponent(answer, components)?.id ?? null });
    }
  }
  return [...seen.values()].sort((a, b) => b.rows - a.rows);
}

export function withSuggestedAnswers(mapping: ImportMapping, table: CsvTable, components: readonly ImportComponent[]): ImportMapping {
  const answers = { ...mapping.answers };
  for (const option of answerOptions(table, mapping, components)) {
    if (answers[option.key] === undefined && option.suggested) answers[option.key] = option.suggested;
  }
  return { ...mapping, answers };
}

// Privacy ---------------------------------------------------------------------

// Many contributors are students, so keep as little as we can: a first name
// and a last initial ("Maya Patel" becomes "Maya P.").
export function shortName(full: string, first = "", last = ""): string {
  const clean = (s: string) => s.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  let given = clean(first);
  let family = clean(last);
  if (!given && !family) {
    const parts = clean(full).split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    given = parts[0];
    family = parts.length > 1 ? parts[parts.length - 1] : "";
  }
  if (!given) return family.slice(0, 40);
  const initial = family ? ` ${[...family][0].toUpperCase()}.` : "";
  return `${given.slice(0, 40)}${initial}`;
}

export function cleanEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254 ? email : null;
}

// A row's identity across re-imports: the same row in next week's download
// gets the same id, so importing again never makes a second pledge.
export function rowFingerprint(row: readonly string[]): string {
  const text = row.map((cell) => cell.trim()).join("\u001f");
  return hash32(text, 0x811c9dc5) + hash32(text, 0x01000193 ^ 0x9e3779b9);
}

function hash32(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Planning ----------------------------------------------------------------------

export interface PlannedPledge {
  rowNumber: number;
  sourceRowId: string;
  componentId: string;
  quantity: number;
  guestName: string;
  guestEmail: string | null;
  note: string;
}

export interface ImportPlan {
  create: PlannedPledge[];
  duplicates: { rowNumber: number; componentId: string; quantity: number; guestName: string }[];
  overCap: { rowNumber: number; componentId: string; quantity: number; guestName: string; room: number }[];
  errors: { rowNumber: number; message: string }[];
  // Rows with nothing to import: blank, or answers set to "Don't import".
  skipped: { rowNumber: number; reason: string }[];
}

export function parseImportQuantity(cell: string): number | null {
  const raw = cell.trim().replace(/,/g, "");
  if (raw === "") return null;
  const match = raw.match(/\d+/);
  if (!match) return NaN;
  return Number(match[0]);
}

export function planImport(input: {
  table: CsvTable;
  mapping: ImportMapping;
  components: readonly ImportComponent[];
  // What still needs a pledge, per component, before this import.
  uncovered: ReadonlyMap<string, number>;
  // source_row_id values already imported into this drive from this source.
  existing: ReadonlySet<string>;
}): ImportPlan {
  const { table, mapping, components } = input;
  const plan: ImportPlan = { create: [], duplicates: [], overCap: [], errors: [], skipped: [] };
  const room = new Map(components.map((c) => [c.id, Math.max(0, input.uncovered.get(c.id) ?? 0)]));
  const componentIds = new Set(components.map((c) => c.id));
  const inFile = new Set<string>();
  const cell = (row: readonly string[], index: number | null) => (index === null ? "" : (row[index] ?? "").trim());

  table.rows.forEach((row, i) => {
    // Row 1 is the header, as in the spreadsheet the coordinator has open.
    const rowNumber = i + 2;
    const guestName = shortName(cell(row, mapping.name), cell(row, mapping.firstName), cell(row, mapping.lastName)) || "Guest";
    const guestEmail = mapping.keepEmails ? cleanEmail(cell(row, mapping.email)) : null;
    const note = cell(row, mapping.comments).replace(/\s+/g, " ").slice(0, 300);
    const fingerprint = rowFingerprint(row);

    const wanted: { componentId: string; quantity: number }[] = [];
    const rowErrors: string[] = [];

    if (mapping.item !== null) {
      const answers = splitAnswers(cell(row, mapping.item));
      const quantity = parseImportQuantity(cell(row, mapping.quantity));
      if (answers.length === 0) {
        plan.skipped.push({ rowNumber, reason: "No item chosen" });
        return;
      }
      if (Number.isNaN(quantity) || quantity === 0) {
        rowErrors.push(quantity === 0 ? "Quantity is 0" : "Quantity isn't a number");
      }
      for (const answer of answers) {
        const target = mapping.answers[answerKey(answer)];
        if (target === SKIP) continue;
        if (!target || !componentIds.has(target)) {
          rowErrors.push(`“${answer}” isn't matched to an item`);
          continue;
        }
        wanted.push({ componentId: target, quantity: quantity ?? 1 });
      }
    } else {
      for (const [index, componentId] of Object.entries(mapping.itemColumns)) {
        if (!componentIds.has(componentId)) continue;
        const quantity = parseImportQuantity(row[Number(index)] ?? "");
        if (quantity === null || quantity === 0) continue;
        if (Number.isNaN(quantity)) {
          rowErrors.push(`“${table.headers[Number(index)]}” isn't a number`);
          continue;
        }
        wanted.push({ componentId, quantity });
      }
    }

    if (rowErrors.length > 0) {
      plan.errors.push({ rowNumber, message: rowErrors.join("; ") });
      return;
    }
    if (wanted.length === 0) {
      plan.skipped.push({ rowNumber, reason: mapping.item !== null ? "Set to “Don't import”" : "No quantities filled in" });
      return;
    }

    for (const { componentId, quantity } of wanted) {
      if (quantity > 100_000) {
        plan.errors.push({ rowNumber, message: "Quantity is too large" });
        continue;
      }
      const sourceRowId = `${fingerprint}:${componentId}`;
      if (input.existing.has(sourceRowId) || inFile.has(sourceRowId)) {
        plan.duplicates.push({ rowNumber, componentId, quantity, guestName });
        continue;
      }
      inFile.add(sourceRowId);
      const left = room.get(componentId) ?? 0;
      if (quantity > left) {
        plan.overCap.push({ rowNumber, componentId, quantity, guestName, room: left });
        continue;
      }
      room.set(componentId, left - quantity);
      plan.create.push({ rowNumber, sourceRowId, componentId, quantity, guestName, guestEmail, note });
    }
  });
  return plan;
}

export function validateTable(table: CsvTable): string | null {
  if (table.headers.length === 0) return "That file is empty.";
  if (table.headers.length > IMPORT_LIMITS.columns) return `That file has more than ${IMPORT_LIMITS.columns} columns. Is it the right file?`;
  if (table.rows.length === 0) return "That file has a header row but no sign-ups yet.";
  if (table.rows.length > IMPORT_LIMITS.rows) return `That file has more than ${IMPORT_LIMITS.rows} rows. Split it into smaller files.`;
  return null;
}

export function mappingProblem(mapping: ImportMapping): string | null {
  if (mapping.item === null && Object.keys(mapping.itemColumns).length === 0) {
    return "Choose the column that says what each person is bringing.";
  }
  return null;
}

// Live Google Forms posts answers keyed by question title. The coordinator
// tells us which titles mean name, item and quantity.
export interface WebhookQuestions {
  name: string;
  item: string;
  quantity: string;
  email: string;
  comments: string;
  keepEmails: boolean;
  answers: Record<string, string>;
}

export const DEFAULT_WEBHOOK_QUESTIONS: WebhookQuestions = {
  name: "Your name",
  item: "What will you bring?",
  quantity: "How many?",
  email: "Email Address",
  comments: "Anything else?",
  keepEmails: true,
  answers: {},
};

export function cleanWebhookQuestions(raw: unknown): WebhookQuestions {
  const q = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : fallback);
  const answers: Record<string, string> = {};
  if (q.answers && typeof q.answers === "object") {
    for (const [k, v] of Object.entries(q.answers as Record<string, unknown>).slice(0, 500)) {
      if (typeof v === "string") answers[k.slice(0, 200)] = v.slice(0, 80);
    }
  }
  return {
    name: text(q.name, DEFAULT_WEBHOOK_QUESTIONS.name),
    item: text(q.item, DEFAULT_WEBHOOK_QUESTIONS.item),
    quantity: text(q.quantity, DEFAULT_WEBHOOK_QUESTIONS.quantity),
    email: text(q.email, DEFAULT_WEBHOOK_QUESTIONS.email),
    comments: text(q.comments, DEFAULT_WEBHOOK_QUESTIONS.comments),
    keepEmails: q.keepEmails !== false,
    answers,
  };
}

export function tableFromFormAnswers(questions: WebhookQuestions, answers: Record<string, string>): { table: CsvTable; mapping: ImportMapping } {
  const headers = [questions.name, questions.item, questions.quantity, questions.email, questions.comments];
  const pick = (title: string) => {
    if (Object.prototype.hasOwnProperty.call(answers, title)) return answers[title] ?? "";
    const found = Object.keys(answers).find((k) => k.trim().toLowerCase() === title.trim().toLowerCase());
    return found ? (answers[found] ?? "") : "";
  };
  const row = headers.map(pick);
  return {
    table: { headers, rows: [row] },
    mapping: {
      name: 0,
      firstName: null,
      lastName: null,
      email: 3,
      item: 1,
      quantity: 2,
      comments: 4,
      timestamp: null,
      itemColumns: {},
      answers: questions.answers,
      keepEmails: questions.keepEmails,
    },
  };
}
