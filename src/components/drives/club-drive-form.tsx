"use client";

// "Run your own drive": a club sets up a kit drive for a recipient that isn't
// on KitGap. One form: who it's for, what goes in a kit, how many, by when,
// and which group runs it. The supply list updates as the recipe changes.

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { createClubDriveAction } from "@/actions/club-drives";
import { addDays, todayIn } from "@/domain/dates";
import { CATEGORY_LABEL } from "@/domain/phase";
import { CATEGORIES } from "@/domain/request-input";
import { REQUEST_TEMPLATES } from "@/domain/request-templates";
import { formatCount } from "@/domain/text";
import { newIdempotencyKey } from "@/lib/keys";
import { SubmitButton } from "../ui/button";
import { cn } from "../ui/cn";
import { ErrorSummary, fieldId } from "../ui/error-summary";
import { Fieldset, SelectField, TextArea, TextField } from "../ui/field";
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
  const [title, setTitle] = useState(first.fields.title ?? "");
  const [category, setCategory] = useState<string>(first.fields.category ?? "school_supplies");
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(first.fields.components ?? []));
  const [quantity, setQuantity] = useState("20");
  const [groupChoice, setGroupChoice] = useState<string>(groups[0]?.id ?? "new");
  const today = todayIn("America/New_York");

  const kits = /^\d+$/.test(quantity) ? Number(quantity) : 0;
  const filled = rows.filter((r) => r.name.trim());

  const applyTemplate = (id: string) => {
    const t = KIT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setTitle(t.fields.title ?? "");
    setCategory(t.fields.category ?? "other");
    setRows(rowsFrom(t.fields.components ?? []));
  };
  const update = (k: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  return (
    <PendingContext value={pending}>
      <form onSubmit={onSubmit} className="space-y-10" noValidate>
        <input type="hidden" name="idempotencyKey" value={key} />
        {failed ? <ErrorSummary message={failed.message} fieldErrors={failed.fieldErrors} token={state} code={failed.code} /> : null}

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Who is it for?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={fieldId("recipientName")}
              name="recipientName"
              label="Recipient"
              hint="The shelter, school office or pantry you'll hand the kits to"
              error={errors.recipientName}
              maxLength={120}
            />
            <TextField
              id={fieldId("recipientCity")}
              name="recipientCity"
              label="City or area"
              hint="For example “Kissimmee, FL”"
              error={errors.recipientCity}
              maxLength={120}
            />
          </div>
          <p className="max-w-prose text-sm text-muted">
            They don&rsquo;t need an account. At handover you give them a receipt link, and they confirm what arrived. Ask them first
            what they need: bring only what&rsquo;s on their list.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">What goes in one kit?</h2>
          <div role="group" aria-label="Start from a template" className="flex flex-wrap gap-2">
            {KIT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={templateId === t.id}
                onClick={() => applyTemplate(t.id)}
                className={cn(
                  "press min-h-10 rounded-[2px_8px_8px_2px] border px-3 text-sm font-semibold",
                  templateId === t.id ? "border-forest bg-forest text-white" : "border-line-strong bg-surface text-forest hover:bg-forest-tint",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {errors.components ? <p className="text-sm font-semibold text-danger">{errors.components}</p> : null}
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.key} className="tag-shape grid gap-3 border border-line-strong bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_auto] sm:items-end">
                <TextField
                  id={fieldId(`components.${i}.name`)}
                  name={`components.${i}.name`}
                  label="Item"
                  value={r.name}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                  error={errors[`components.${i}.name`]}
                  maxLength={80}
                />
                <TextField
                  id={fieldId(`components.${i}.quantityPerUnit`)}
                  name={`components.${i}.quantityPerUnit`}
                  label="Per kit"
                  inputMode="numeric"
                  value={r.quantityPerUnit}
                  onChange={(e) => update(r.key, { quantityPerUnit: e.target.value })}
                  error={errors[`components.${i}.quantityPerUnit`]}
                />
                <TextField
                  id={fieldId(`components.${i}.details`)}
                  name={`components.${i}.details`}
                  label="Details"
                  optional
                  value={r.details}
                  onChange={(e) => update(r.key, { details: e.target.value })}
                  error={errors[`components.${i}.details`]}
                  maxLength={300}
                />
                <button
                  type="button"
                  onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
                  disabled={rows.length === 1}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-danger hover:bg-danger-tint disabled:text-muted"
                >
                  <Minus className="size-4" aria-hidden="true" />
                  Remove<span className="sr-only"> {r.name || `item ${i + 1}`}</span>
                </button>
              </li>
            ))}
          </ol>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id={fieldId("quantity")}
              name="quantity"
              label="Number of kits"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
            />
            <TextField
              id={fieldId("neededBy")}
              name="neededBy"
              label="Hand over by"
              type="date"
              min={today}
              max={addDays(today, 366)}
              defaultValue={addDays(today, 28)}
              error={errors.neededBy}
            />
            <SelectField
              id={fieldId("category")}
              name="category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              error={errors.category}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            />
          </div>
          <TextField
            id={fieldId("title")}
            name="title"
            label="Name of the drive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            maxLength={140}
          />
          <section aria-live="polite" className="tag-shape border border-line-strong bg-paper px-4 py-4">
            <h3 className="font-semibold">{kits > 0 ? `Your supply list for ${formatCount(kits)} kits` : "Your supply list"}</h3>
            {kits > 0 && filled.length > 0 ? (
              <ul className="mt-2 divide-y divide-line">
                {filled.map((r) => {
                  const per = /^\d+$/.test(r.quantityPerUnit) ? Number(r.quantityPerUnit) : 0;
                  return (
                    <li key={r.key} className="flex items-baseline justify-between gap-4 py-2">
                      <span>{r.name}</span>
                      <span key={per * kits} className="appear tabular text-lg font-semibold">
                        {formatCount(per * kits)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-muted">Add items and a number of kits to see what your group will collect.</p>
            )}
          </section>
          <TextArea
            id={fieldId("handoverInstructions")}
            name="handoverInstructions"
            label="Handover details"
            optional
            hint="Where and when you'll drop off, and who to ask for. Only your group sees this."
            error={errors.handoverInstructions}
            rows={3}
            maxLength={2000}
          />
        </section>

        <Fieldset
          legend={<span className="font-serif text-2xl font-semibold tracking-tight">Which group is running it?</span>}
          id={fieldId("groupId")}
          error={errors.groupId}
        >
          <div className="space-y-2">
            {groups.map((g) => (
              <label
                key={g.id}
                className="flex min-h-12 items-start gap-3 rounded-lg border border-line-strong bg-surface px-3 py-3 has-[:checked]:border-forest has-[:checked]:bg-forest-tint"
              >
                <input
                  type="radio"
                  name="groupId"
                  value={g.id}
                  checked={groupChoice === g.id}
                  onChange={() => setGroupChoice(g.id)}
                  className="mt-1 size-5 accent-forest"
                />
                <span className="font-semibold">{g.name}</span>
              </label>
            ))}
            <label className="flex min-h-12 items-start gap-3 rounded-lg border border-line-strong bg-surface px-3 py-3 has-[:checked]:border-forest has-[:checked]:bg-forest-tint">
              <input
                type="radio"
                name="groupId"
                value="new"
                checked={groupChoice === "new"}
                onChange={() => setGroupChoice("new")}
                className="mt-1 size-5 accent-forest"
              />
              <span>
                <span className="font-semibold">{groups.length ? "A new group" : "Create your group"}</span>
                <span className="block text-sm text-muted">A name and city. You&rsquo;ll coordinate it and can invite members after.</span>
              </span>
            </label>
          </div>
          {groupChoice === "new" ? (
            <div className="grid gap-4 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2">
              <TextField id={fieldId("group.name")} name="groupName" label="Group name" error={errors["group.name"]} maxLength={120} />
              <TextField id={fieldId("group.city")} name="groupCity" label="City or area" error={errors["group.city"]} maxLength={120} />
            </div>
          ) : null}
        </Fieldset>

        <div className="space-y-3">
          <SubmitButton pendingLabel="Starting your drive…" disabled={kits < 1} className="min-h-12 w-full px-6 sm:w-auto">
            Start the drive
          </SubmitButton>
          <p className="max-w-prose text-sm text-muted">
            This drive is yours: it isn&rsquo;t listed on KitGap and other groups can&rsquo;t join it. You get the supply checklist, an
            invitation link for members, sign-up import, packing and a public progress page.
          </p>
        </div>
      </form>
    </PendingContext>
  );
}
