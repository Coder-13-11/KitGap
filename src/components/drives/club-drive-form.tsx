"use client";

// "Run your own drive": a club collects kits for a place that isn't on
// KitGap. Only what's needed to start is asked up front; the drive name and
// drop-off notes are under "More options" and have sensible defaults.

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { createClubDriveAction } from "@/actions/club-drives";
import { addDays, todayIn } from "@/domain/dates";
import { REQUEST_TEMPLATES } from "@/domain/request-templates";
import { countNoun, listPhrase } from "@/domain/text";
import { newIdempotencyKey } from "@/lib/keys";
import { SubmitButton } from "../ui/button";
import { cn } from "../ui/cn";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { inputClass, SelectField, TextArea, TextField } from "../ui/field";
import { PendingContext, useActionSubmit } from "../ui/use-action-submit";

interface Row {
  key: number;
  name: string;
  quantityPerUnit: string;
  details: string;
}

const KIT_TEMPLATES = REQUEST_TEMPLATES.filter((t) => t.fields.requestType === "kit");

let rowKey = 0;
function rowsFrom(components: { name: string; quantityPerUnit: string | number; details: string }[]): Row[] {
  return components.map((c) => ({ key: ++rowKey, name: c.name, quantityPerUnit: String(c.quantityPerUnit), details: c.details }));
}

export function ClubDriveForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [key] = useState(newIdempotencyKey);
  const { state, pending, onSubmit } = useActionSubmit(createClubDriveAction);
  const failed = state && !state.ok ? state : null;
  const errors = failed?.fieldErrors ?? {};

  const first = KIT_TEMPLATES[0];
  const [templateId, setTemplateId] = useState<string>(first.id);
  const [category, setCategory] = useState<string>(first.fields.category ?? "other");
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(first.fields.components ?? []));
  const [quantity, setQuantity] = useState("20");
  const [recipient, setRecipient] = useState("");
  const [groupChoice, setGroupChoice] = useState<string>(groups[0]?.id ?? "new");
  const today = todayIn("America/New_York");

  const kits = /^\d+$/.test(quantity) ? Number(quantity) : 0;
  const filled = rows.filter((r) => r.name.trim());
  const moreOpen = Boolean(errors.title || errors.handoverInstructions);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = KIT_TEMPLATES.find((x) => x.id === id);
    setCategory(t?.fields.category ?? "other");
    setRows(t ? rowsFrom(t.fields.components ?? []) : [{ key: ++rowKey, name: "", quantityPerUnit: "1", details: "" }]);
  };
  const update = (k: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} className="space-y-10" noValidate>
        <input type="hidden" name="idempotencyKey" value={key} />
        <input type="hidden" name="category" value={category} />
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} code={failed.code} /> : null}

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Who is it for?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={fieldId("recipientName")}
              name="recipientName"
              label="Place you're giving to"
              hint="A shelter, school, pantry or similar"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              error={errors.recipientName}
              maxLength={120}
            />
            <TextField
              id={fieldId("recipientCity")}
              name="recipientCity"
              label="City"
              hint="For example “Kissimmee, FL”"
              error={errors.recipientCity}
              autoComplete="address-level2"
              maxLength={120}
            />
          </div>
          <p className="text-sm text-muted">Ask them what they need first. They don&rsquo;t need an account.</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">What goes in each kit?</h2>
          <div role="group" aria-label="Start from" className="flex flex-wrap gap-2">
            {[...KIT_TEMPLATES.map((t) => ({ id: t.id as string, label: t.label })), { id: "blank", label: "My own list" }].map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={templateId === t.id}
                onClick={() => applyTemplate(t.id)}
                className={cn(
                  "press min-h-10 rounded-md border px-3 text-sm font-semibold",
                  templateId === t.id ? "border-forest bg-forest text-white" : "border-line-strong bg-surface text-forest hover:bg-forest-tint",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {errors.components ? <p className="text-sm font-semibold text-danger">{errors.components}</p> : null}

          <div className="rounded-lg border border-line-strong bg-surface">
            <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_2.75rem] gap-2 border-b border-line px-3 py-2 text-sm font-semibold text-muted sm:grid">
              <span>Item</span>
              <span>Per kit</span>
              <span>Details (optional)</span>
            </div>
            <ol className="divide-y divide-line">
              {rows.map((r, i) => {
                const nameError = errors[`components.${i}.name`];
                const qtyError = errors[`components.${i}.quantityPerUnit`];
                return (
                  <li key={r.key} className="px-3 py-2.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.75rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_2.75rem]">
                      <input
                        id={fieldId(`components.${i}.name`)}
                        name={`components.${i}.name`}
                        aria-label={`Item ${i + 1}`}
                        placeholder="Item"
                        value={r.name}
                        onChange={(e) => update(r.key, { name: e.target.value })}
                        aria-invalid={nameError ? true : undefined}
                        className={inputClass(nameError)}
                        maxLength={80}
                      />
                      <input
                        id={fieldId(`components.${i}.quantityPerUnit`)}
                        name={`components.${i}.quantityPerUnit`}
                        aria-label={`How many ${r.name || `of item ${i + 1}`} per kit`}
                        inputMode="numeric"
                        value={r.quantityPerUnit}
                        onChange={(e) => update(r.key, { quantityPerUnit: e.target.value })}
                        aria-invalid={qtyError ? true : undefined}
                        className={inputClass(qtyError, "text-center")}
                      />
                      <input
                        id={fieldId(`components.${i}.details`)}
                        name={`components.${i}.details`}
                        aria-label={`Details for ${r.name || `item ${i + 1}`} (optional)`}
                        placeholder="Details (optional)"
                        value={r.details}
                        onChange={(e) => update(r.key, { details: e.target.value })}
                        className={inputClass(errors[`components.${i}.details`], "col-span-2 row-start-2 text-sm sm:col-span-1 sm:row-start-auto")}
                        maxLength={300}
                      />
                      <button
                        type="button"
                        onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
                        disabled={rows.length === 1}
                        aria-label={`Remove ${r.name || `item ${i + 1}`}`}
                        className="col-start-3 row-start-1 grid size-11 place-items-center rounded-md text-muted hover:bg-danger-tint hover:text-danger disabled:opacity-40 sm:col-start-4"
                      >
                        <X aria-hidden className="size-5" />
                      </button>
                    </div>
                    {nameError || qtyError ? <p className="mt-1 text-sm font-semibold text-danger">{nameError ?? qtyError}</p> : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <button
            type="button"
            onClick={() => setRows((all) => [...all, { key: ++rowKey, name: "", quantityPerUnit: "1", details: "" }])}
            disabled={rows.length >= 20}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold text-forest hover:bg-forest-tint"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add an item
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">How many, and by when?</h2>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id={fieldId("quantity")}
              name="quantity"
              label="Kits"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
            />
            <TextField
              id={fieldId("neededBy")}
              name="neededBy"
              label="Drop off by"
              type="date"
              min={today}
              max={addDays(today, 366)}
              defaultValue={addDays(today, 28)}
              error={errors.neededBy}
            />
          </div>
          {kits > 0 && filled.length > 0 ? (
            <p aria-live="polite" className="rounded-lg bg-sunken px-4 py-3">
              <span className="font-semibold">You&rsquo;ll collect: </span>
              {listPhrase(
                filled.map((r) => countNoun((/^\d+$/.test(r.quantityPerUnit) ? Number(r.quantityPerUnit) : 0) * kits, r.name)),
              )}
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Who&rsquo;s running it?</h2>
          {groups.length > 0 ? (
            <SelectField
              id={fieldId("groupId")}
              name="groupId"
              label="Group"
              value={groupChoice}
              onChange={(e) => setGroupChoice(e.target.value)}
              error={errors.groupId}
              options={[...groups.map((g) => ({ value: g.id, label: g.name })), { value: "new", label: "A new group…" }]}
            />
          ) : (
            <input type="hidden" name="groupId" value="new" />
          )}
          {groupChoice === "new" ? (
            <TextField
              id={fieldId("group.name")}
              name="groupName"
              label={groups.length > 0 ? "New group's name" : "Your group's name"}
              hint="Shown on the drive's public page, like “Lakeside High Key Club” or “The Garcia family”"
              error={errors["group.name"] ?? errors["group.city"]}
              autoComplete="organization"
              maxLength={120}
            />
          ) : null}
        </section>

        <details open={moreOpen || undefined} className="group rounded-lg border border-line bg-surface px-4 py-3">
          <summary className="min-h-11 cursor-pointer content-center font-semibold text-forest">More options</summary>
          <div className="mt-3 space-y-4">
            <TextField
              id={fieldId("title")}
              name="title"
              label="Drive name"
              optional
              placeholder={recipient.trim() ? `Kits for ${recipient.trim()}` : "Kits for …"}
              error={errors.title}
              maxLength={140}
            />
            <TextArea
              id={fieldId("handoverInstructions")}
              name="handoverInstructions"
              label="Drop-off notes"
              optional
              hint="Where and when you'll drop off, and who to ask for. Only your group sees this."
              error={errors.handoverInstructions}
              rows={3}
              maxLength={2000}
            />
          </div>
        </details>

        <div className="space-y-3">
          <SubmitButton pendingLabel="Starting…" disabled={kits < 1} className="min-h-12 w-full px-6 sm:w-auto">
            Start the drive
          </SubmitButton>
          <p className="text-sm text-muted">
            Only your group can see this drive. When you drop off, the place confirms what arrived from a link you give them.
          </p>
        </div>
      </form>
    </PendingContext>
  );
}
