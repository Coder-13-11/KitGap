// A person's own record of drives they joined on other sites. KitGap can't
// see SignUpGenius, Facebook or anywhere else, so it saves what the person
// tells it: "I signed up", then later "I donated 12 items". Only that person
// ever sees these records.

import { platformFor, PLATFORM_LABEL } from "@/domain/discovery";
import { DomainError } from "@/domain/errors";
import { cleanUrl } from "../discovery/rank";
import { isUuid, mutate, now, read, type ServiceContext } from "./core";

export interface ExternalSignup {
  id: string;
  url: string;
  title: string;
  platform: string;
  platformLabel: string;
  organizer: string;
  status: "signed_up" | "donated" | "cancelled";
  plan: string;
  itemsGiven: number | null;
  createdAt: Date;
}

function invalid(field: string, message: string): never {
  throw new DomainError("invalid_input", "Some answers need attention.", { fieldErrors: { [field]: message } });
}

export async function saveExternalSignup(
  ctx: ServiceContext,
  input: { url: string; title: string; organizer?: string; plan?: string; idempotencyKey?: string },
) {
  const url = cleanUrl(input.url.trim());
  if (!url) invalid("url", "That link doesn't look right. It should start with https://");
  const title = input.title.trim().slice(0, 300);
  if (!title) invalid("title", "Add a short name for this drive");
  const plan = (input.plan ?? "").trim().slice(0, 300);
  const organizer = (input.organizer ?? "").trim().slice(0, 200);
  const platform = platformFor(url);
  return mutate(ctx, { action: "external.save", idempotencyKey: input.idempotencyKey }, async (tx, userId) => {
    const [row] = await tx`
      insert into external_signups (user_id, url, title, platform, organizer, plan)
      values (${userId}, ${url}, ${title}, ${platform}, ${organizer}, ${plan})
      on conflict (user_id, url) do update
        set title = excluded.title, plan = case when excluded.plan = '' then external_signups.plan else excluded.plan end,
            status = case when external_signups.status = 'cancelled' then 'signed_up' else external_signups.status end,
            updated_at = ${now(ctx)}
      returning id
    `;
    return { id: row.id as string };
  });
}

export async function updateExternalSignup(
  ctx: ServiceContext,
  input: { id: string; status?: string; plan?: string; itemsGiven?: string | number | null },
) {
  if (!isUuid(input.id)) throw new DomainError("not_found", "We couldn't find that drive.");
  const status = input.status ?? undefined;
  if (status && !["signed_up", "donated", "cancelled"].includes(status)) invalid("status", "Choose a status");
  let items: number | null | undefined;
  if (input.itemsGiven !== undefined && input.itemsGiven !== null && String(input.itemsGiven).trim() !== "") {
    const raw = String(input.itemsGiven).replace(/,/g, "").trim();
    if (!/^\d+$/.test(raw) || Number(raw) > 100_000) invalid("itemsGiven", "Enter a whole number");
    items = Number(raw);
  }
  return mutate(ctx, { action: "external.update" }, async (tx, userId) => {
    const [row] = await tx`select id from external_signups where id = ${input.id} and user_id = ${userId}`;
    if (!row) throw new DomainError("not_found", "We couldn't find that drive.");
    await tx`
      update external_signups set
        status = coalesce(${status ?? null}, status),
        plan = coalesce(${input.plan === undefined ? null : input.plan.trim().slice(0, 300)}, plan),
        items_given = case when ${items === undefined} then items_given else ${items ?? null}::int end,
        updated_at = ${now(ctx)}
      where id = ${input.id} and user_id = ${userId}
    `;
    return { id: input.id };
  });
}

export async function listExternalSignups(ctx: ServiceContext): Promise<ExternalSignup[]> {
  if (!ctx.userId) return [];
  const userId = ctx.userId;
  return read(ctx, async (tx) => {
    const rows = await tx`
      select * from external_signups where user_id = ${userId} and status <> 'cancelled' order by created_at desc limit 100
    `;
    return rows.map((r) => ({
      id: r.id as string,
      url: r.url as string,
      title: r.title as string,
      platform: r.platform as string,
      platformLabel: PLATFORM_LABEL[r.platform as keyof typeof PLATFORM_LABEL] ?? "Website",
      organizer: r.organizer as string,
      status: r.status as ExternalSignup["status"],
      plan: r.plan as string,
      itemsGiven: (r.itemsGiven as number | null) ?? null,
      createdAt: r.createdAt as Date,
    }));
  });
}
