"use client";

// "Import sign-ups": bring a Google Forms or SignUpGenius download into the
// drive as pledges. Choose the file, check what we matched, see exactly what
// will be added, then confirm. Nothing is saved until the last step.

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, FileSpreadsheet, Loader2, RotateCcw, Upload } from "lucide-react";
import { importPledgesAction, previewImportAction } from "@/actions/imports";
import { FILE_SOURCES, IMPORT_LIMITS, IMPORT_SOURCE_LABEL, SKIP, type ImportMapping, type ImportSource } from "@/domain/import";
import { countNoun, formatCount } from "@/domain/text";
import type { ImportPreview } from "@/server/services/imports";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { inputClass } from "../ui/field";

type Done = Awaited<ReturnType<typeof importPledgesAction>> & { ok: true };

const ROLE_LABEL: { role: keyof Pick<ImportMapping, "name" | "firstName" | "lastName" | "item" | "quantity" | "comments" | "email">; label: string; hint?: string }[] = [
  { role: "item", label: "What they're bringing" },
  { role: "quantity", label: "How many", hint: "Leave as “Not in this file” and each row counts as 1." },
  { role: "name", label: "Name" },
  { role: "firstName", label: "First name" },
  { role: "lastName", label: "Last name" },
  { role: "comments", label: "Comments" },
  { role: "email", label: "Email" },
];

const SAMPLE_FILE = "/samples/google-forms-sample.csv";

// `sample` offers a fictional Google Forms export, for the demo.
export function ImportSignups({ commitmentId, unitName, sample = false }: { commitmentId: string; unitName: string; sample?: boolean }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done["data"] | null>(null);
  const [checking, startChecking] = useTransition();
  const [saving, startSaving] = useTransition();
  const key = useRef<string>("");
  const input = useRef<HTMLInputElement>(null);

  const check = (next: { name: string; text: string }, mapping?: ImportMapping, source?: ImportSource) => {
    setError(null);
    startChecking(async () => {
      const result = await previewImportAction({ commitmentId, csv: next.text, mapping, source });
      if (result.ok) setPreview(result.data);
      else setError(result.message);
    });
  };

  const choose = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > IMPORT_LIMITS.bytes) {
      setError("That file is over 1 MB. Split it into smaller files.");
      return;
    }
    if (/\.(xlsx|xls|numbers)$/i.test(f.name)) {
      setError("That's a spreadsheet file. In Excel or Google Sheets choose File, then Download (or Save as), then CSV, and pick that file.");
      return;
    }
    const next = { name: f.name, text: await f.text() };
    key.current = crypto.randomUUID();
    setDone(null);
    setFile(next);
    setPreview(null);
    check(next);
  };

  const trySample = async () => {
    setError(null);
    const res = await fetch(SAMPLE_FILE).catch(() => null);
    if (!res?.ok) {
      setError("The sample file didn't load. Try again.");
      return;
    }
    await choose(new File([await res.text()], "google-forms-sample.csv", { type: "text/csv" }));
  };

  const update = (patch: Partial<ImportMapping>) => {
    if (!file || !preview) return;
    check(file, { ...preview.mapping, ...patch }, preview.source);
  };

  const confirm = () => {
    if (!file || !preview) return;
    setError(null);
    startSaving(async () => {
      const result = await importPledgesAction({
        commitmentId,
        csv: file.text,
        mapping: preview.mapping,
        source: preview.source,
        fileName: file.name,
        idempotencyKey: key.current,
      });
      if (result.ok) {
        setDone(result.data);
        setPreview(null);
        setFile(null);
      } else {
        setError(result.message);
      }
    });
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setDone(null);
  };

  return (
    <section aria-labelledby="import-title" id="import" className="tag-shape scroll-mt-32 overflow-hidden border border-line-strong bg-surface shadow-card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <h3 id="import-title" className="font-serif text-2xl font-semibold">
            Import sign-ups
          </h3>
          <p className="mt-1 max-w-prose text-muted">
            Bring a Google Forms or SignUpGenius file in as pledges. Nothing is saved until you confirm, and you still record what actually arrives.
          </p>
        </div>
        {!file && !done ? (
          <div className="flex shrink-0 flex-col gap-2">
            <Button onClick={() => input.current?.click()} className="min-h-12 px-5 text-lg">
              <Upload aria-hidden className="size-5" />
              Import sign-ups
            </Button>
            {sample ? (
              <Button variant="secondary" onClick={() => void trySample()}>
                Try it with a sample Google Forms file
              </Button>
            ) : null}
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-forest">
              How do I get the file?
              <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        ) : null}
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv,.tsv,text/tab-separated-values,.txt"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {open && !file && !done ? <HowTo /> : null}

      {error ? (
        <p role="alert" className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-[#fdecea] px-4 py-3 text-[#8f1f14] sm:mx-6">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      ) : null}

      {file && !preview && checking ? (
        <p role="status" className="flex items-center gap-2 border-t border-line px-5 py-4 font-semibold sm:px-6">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          Reading {file.name}…
        </p>
      ) : null}

      {file && preview ? (
        <ImportReview
          fileName={file.name}
          preview={preview}
          checking={checking}
          saving={saving}
          unitName={unitName}
          onSource={(source) => check(file, preview.mapping, source)}
          onMapping={update}
          onConfirm={confirm}
          onCancel={reset}
        />
      ) : null}

      {done ? (
        <div className="appear space-y-3 border-t border-line px-5 py-5 sm:px-6" role="status">
          <p className="flex items-center gap-2 font-serif text-2xl font-semibold text-forest">
            <CheckCircle2 aria-hidden className="size-7" />
            {done.created === 0 ? "Nothing new to add" : `Added ${done.created} ${done.created === 1 ? "pledge" : "pledges"}`}
          </p>
          <p className="text-muted">
            {[
              done.created > 0 ? `${done.quantity} items promised` : null,
              done.duplicates > 0 ? `${done.duplicates} ${done.duplicates === 1 ? "repeat" : "repeats"} skipped` : null,
              done.overCap > 0 ? `${done.overCap} left out because nobody needs that many more` : null,
              done.errors > 0 ? `${done.errors} rows had problems` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Everything in this file was already here."}
          </p>
          <p className="text-sm text-muted">Importing the same file again later only adds the new rows.</p>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw aria-hidden className="size-4" />
            Import another file
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function HowTo() {
  return (
    <div className="grid gap-4 border-t border-line px-5 py-5 text-[0.95rem] sm:grid-cols-3 sm:px-6">
      <div>
        <h3 className="font-semibold">Google Forms</h3>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
          <li>Open the form and go to Responses.</li>
          <li>Click the three dots, then Download responses (.csv).</li>
          <li>Unzip it if needed, then import the .csv here.</li>
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">SignUpGenius</h3>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
          <li>Open your sign-up and go to Reports.</li>
          <li>Choose the sign-up report and export it as CSV.</li>
          <li>Import that file here.</li>
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">Excel or Google Sheets</h3>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
          <li>One row per person, with a header row.</li>
          <li>Columns for name, item and how many.</li>
          <li>File, then Download or Save as, then CSV.</li>
        </ol>
      </div>
      <p className="text-sm text-muted sm:col-span-3">
        We keep first names and last initials only. Emails are left out unless you choose to keep them, and only coordinators ever see them.
      </p>
    </div>
  );
}

function ImportReview({
  fileName,
  preview,
  checking,
  saving,
  unitName,
  onSource,
  onMapping,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  preview: ImportPreview;
  checking: boolean;
  saving: boolean;
  unitName: string;
  onSource: (source: ImportSource) => void;
  onMapping: (patch: Partial<ImportMapping>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { plan, mapping, headers, components } = preview;
  const name = new Map(components.map((c) => [c.id, c.name]));
  const quantity = plan.create.reduce((sum, p) => sum + p.quantity, 0);
  const columnOptions = [{ value: "", label: "Not in this file" }, ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))];
  const itemOptions = [{ value: "", label: "Choose an item…" }, ...components.map((c) => ({ value: c.id, label: c.name })), { value: SKIP, label: "Don't import" }];
  const unmatched = preview.answers.filter((a) => !mapping.answers[a.key]);
  const wide = mapping.item === null;

  return (
    <div className="space-y-6 border-t border-line bg-surface px-5 py-6 sm:px-6" aria-busy={checking}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          <FileSpreadsheet aria-hidden className="mr-1.5 inline size-5 align-[-0.2em] text-forest" />
          {fileName} · {preview.rowCount} {preview.rowCount === 1 ? "row" : "rows"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">This file is from</span>
          <select
            value={preview.source}
            onChange={(e) => onSource(e.target.value as ImportSource)}
            className={inputClass(undefined, "w-auto py-1.5")}
          >
            {FILE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s === "spreadsheet" ? "Another spreadsheet" : IMPORT_SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">1. Check the columns</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_LABEL.map(
            ({ role, label, hint }) => (
              <label key={role} className="flex flex-col gap-1">
                <span className="font-semibold">{label}</span>
                <select
                  value={mapping[role] === null ? "" : String(mapping[role])}
                  onChange={(e) => onMapping({ [role]: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputClass()}
                >
                  {columnOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {hint ? <span className="text-sm text-muted">{hint}</span> : null}
              </label>
            ),
          )}
        </div>
        {mapping.email !== null ? (
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={mapping.keepEmails} onChange={(e) => onMapping({ keepEmails: e.target.checked })} className="mt-1 size-5 accent-forest" />
            <span>
              Keep emails so coordinators can remind people
              <span className="block text-sm text-muted">Leave this off for students. Only this drive&apos;s coordinators would ever see them.</span>
            </span>
          </label>
        ) : null}
      </fieldset>

      {wide && Object.keys(mapping.itemColumns).length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">2. Match questions to items</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(mapping.itemColumns).map(([index, componentId]) => (
              <li key={index} className="space-y-1.5 rounded-lg border border-line/80 bg-sunken/50 p-3">
                <p className="truncate font-semibold" title={headers[Number(index)]}>
                  “{headers[Number(index)]}”
                </p>
                <select
                  aria-label={`Item for the question “${headers[Number(index)]}”`}
                  value={componentId}
                  onChange={(e) => {
                    const next = { ...mapping.itemColumns };
                    if (e.target.value === "" || e.target.value === SKIP) delete next[index];
                    else next[index] = e.target.value;
                    onMapping({ itemColumns: next });
                  }}
                  className={inputClass()}
                >
                  {itemOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {!wide && preview.answers.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">2. Match answers to this drive&apos;s items</legend>
          {unmatched.length > 0 ? (
            <p className="text-sm font-semibold text-clay">
              {unmatched.length} {unmatched.length === 1 ? "answer needs" : "answers need"} a match. Pick an item or “Don&apos;t import”.
            </p>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {preview.answers.map((a) => (
              <li key={a.key} className="space-y-1.5 rounded-lg border border-line/80 bg-sunken/50 p-3">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold" title={a.text}>
                    “{a.text}”
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {a.rows} {a.rows === 1 ? "row" : "rows"}
                  </span>
                </p>
                <select
                  aria-label={`Item for the answer “${a.text}”`}
                  value={mapping.answers[a.key] ?? ""}
                  onChange={(e) => {
                    const next = { ...mapping.answers };
                    if (e.target.value === "") delete next[a.key];
                    else next[a.key] = e.target.value;
                    onMapping({ answers: next });
                  }}
                  className={inputClass(mapping.answers[a.key] ? undefined : "needs match")}
                >
                  {itemOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">3. Here&apos;s what will happen</h3>
        <ul className="grid gap-2 sm:grid-cols-4" aria-live="polite">
          <Tally tone="forest" n={plan.create.length} label={plan.create.length === 1 ? "pledge to add" : "pledges to add"} />
          <Tally n={plan.duplicates.length} label={plan.duplicates.length === 1 ? "repeat, skipped" : "repeats, skipped"} />
          <Tally tone={plan.overCap.length ? "amber" : undefined} n={plan.overCap.length} label="over what's needed" />
          <Tally tone={plan.errors.length ? "danger" : undefined} n={plan.errors.length} label={plan.errors.length === 1 ? "row needs a fix" : "rows need a fix"} />
        </ul>

        {plan.create.length > 0 ? (
          <div className="max-h-80 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-[0.95rem]">
              <caption className="sr-only">Pledges that will be added</caption>
              <thead className="sticky top-0 bg-sunken text-sm text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Row
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Who
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Bringing
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    How many
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {plan.create.slice(0, 100).map((p) => (
                  <tr key={p.sourceRowId}>
                    <td className="px-3 py-2 text-muted tabular-nums">{p.rowNumber}</td>
                    <td className="px-3 py-2">{p.guestName}</td>
                    <td className="px-3 py-2">{name.get(p.componentId)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.create.length > 100 ? <p className="px-3 py-2 text-sm text-muted">…and {plan.create.length - 100} more.</p> : null}
          </div>
        ) : null}

        {plan.overCap.length > 0 ? (
          <Issues
            tone="amber"
            title="Not added: more than what's still needed"
            items={plan.overCap.map(
              (o) => `Row ${o.rowNumber}: ${o.guestName}, ${countNoun(o.quantity, name.get(o.componentId) ?? "item")} (${o.room === 0 ? "none" : `only ${formatCount(o.room)}`} still needed)`,
            )}
          />
        ) : null}
        {plan.errors.length > 0 ? <Issues tone="danger" title="Not added: fix these in the file or above" items={plan.errors.map((e) => `Row ${e.rowNumber}: ${e.message}`)} /> : null}
        {plan.skipped.length > 0 ? (
          <p className="text-sm text-muted">
            {plan.skipped.length} {plan.skipped.length === 1 ? "row has" : "rows have"} nothing to bring (blank or “Don&apos;t import”).
          </p>
        ) : null}
        {preview.problem ? <p className="font-semibold text-clay">{preview.problem}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button onClick={onConfirm} disabled={plan.create.length === 0 || checking || Boolean(preview.problem)} pending={saving} pendingLabel="Adding…" className="min-h-12 px-5 text-lg">
          <Check aria-hidden className="size-5" />
          {plan.create.length === 0 ? "Nothing to add" : `Add ${plan.create.length} ${plan.create.length === 1 ? "pledge" : "pledges"} (${quantity} items)`}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {checking ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Updating the preview…
          </span>
        ) : null}
        <p className="w-full text-sm text-muted">
          These are promises, not {unitName === "kit" ? "supplies" : "items"} received. Nothing is counted as collected until you record it arriving.
        </p>
      </div>
    </div>
  );
}

function Tally({ n, label, tone }: { n: number; label: string; tone?: "forest" | "amber" | "danger" }) {
  return (
    <li
      className={cn(
        "rounded-xl px-4 py-3 ring-1",
        tone === "forest" ? "bg-forest-tint ring-forest/30" : tone === "amber" ? "bg-[#fff4e0] ring-[#e8b04a]/50" : tone === "danger" ? "bg-[#fdecea] ring-[#d9534f]/40" : "bg-sunken ring-line",
      )}
    >
      <span className="block font-serif text-3xl font-semibold tabular-nums">{n}</span>
      <span className="text-sm">{label}</span>
    </li>
  );
}

function Issues({ title, items, tone }: { title: string; items: string[]; tone: "amber" | "danger" }) {
  return (
    <details className={cn("rounded-xl px-4 py-3", tone === "amber" ? "bg-[#fff4e0]" : "bg-[#fdecea]")} open={items.length <= 5}>
      <summary className="cursor-pointer font-semibold">
        {title} ({items.length})
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.95rem]">
        {items.slice(0, 50).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </details>
  );
}
