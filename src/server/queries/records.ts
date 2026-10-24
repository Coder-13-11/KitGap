// Public confirmed records and the organization's private receipt book.
// Counts come only from reviewed deliveries. Pledges are not read.

import { confirmedMilestone } from "@/domain/guidance";
import type { Tx } from "../db/client";
import { isUuid, read, roleIn, type ServiceContext } from "../services/core";

const PUBLIC_REQUEST = ["published", "closed", "cancelled"] as const;

export interface RecordTotal {
  unitName: string;
  accepted: number;
}

export interface RecordPartner {
  id: string;
  name: string;
  totals: RecordTotal[];
}

export interface RecordEvent {
  id: string;
  reviewedAt: Date;
  accepted: number;
  unitName: string;
  requestId: string;
  requestTitle: string;
  partnerId: string;
  partnerName: string;
}

export interface PublicRecord {
  kind: "group" | "organization";
  id: string;
  name: string;
  city: string;
  totals: RecordTotal[];
  milestone: ReturnType<typeof confirmedMilestone>;
  partners: RecordPartner[];
  timeline: RecordEvent[];
}

export interface ReceiptLine {
  id: string;
  reviewedAt: Date;
  groupName: string;
  accepted: number;
  unitName: string;
  requestTitle: string;
}

interface AcceptedRow {
  id: string;
  acceptedQuantity: number;
  reviewedAt: Date;
  requestId: string;
  requestTitle: string;
  unitName: string;
  partnerId: string;
  partnerName: string;
}

function totalsFrom(rows: { unitName: string; accepted: number }[]): RecordTotal[] {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.unitName, (map.get(row.unitName) ?? 0) + row.accepted);
  return [...map.entries()].map(([unitName, accepted]) => ({ unitName, accepted })).sort((a, b) => a.unitName.localeCompare(b.unitName));
}

async function acceptedRows(tx: Tx, kind: "group" | "organization", id: string): Promise<AcceptedRow[]> {
  if (kind === "group") {
    return (await tx`
      select d.id, d.accepted_quantity, d.reviewed_at,
             r.id as request_id, r.title as request_title, r.unit_name,
             o.id as partner_id, o.name as partner_name
      from deliveries d
      join commitments c on c.id = d.commitment_id
      join requests r on r.id = c.request_id
      join workspaces o on o.id = r.org_id
      where c.group_id = ${id}
        and d.status = 'reviewed'
        and d.accepted_quantity > 0
        and r.status in ${tx([...PUBLIC_REQUEST])}
      order by d.reviewed_at desc
    `) as unknown as AcceptedRow[];
  }
  return (await tx`
    select d.id, d.accepted_quantity, d.reviewed_at,
           r.id as request_id, r.title as request_title, r.unit_name,
           g.id as partner_id, g.name as partner_name
    from deliveries d
    join commitments c on c.id = d.commitment_id
    join requests r on r.id = c.request_id
    join workspaces g on g.id = c.group_id
    where r.org_id = ${id}
      and d.status = 'reviewed'
      and d.accepted_quantity > 0
      and r.status in ${tx([...PUBLIC_REQUEST])}
    order by d.reviewed_at desc
  `) as unknown as AcceptedRow[];
}

function toRecord(kind: "group" | "organization", workspace: { id: string; name: string; city: string }, rows: AcceptedRow[]): PublicRecord {
  const timeline: RecordEvent[] = rows.map((row) => ({
    id: row.id,
    reviewedAt: row.reviewedAt,
    accepted: row.acceptedQuantity,
    unitName: row.unitName,
    requestId: row.requestId,
    requestTitle: row.requestTitle,
    partnerId: row.partnerId,
    partnerName: row.partnerName,
  }));
  const partners = new Map<string, { id: string; name: string; rows: { unitName: string; accepted: number }[] }>();
  for (const row of timeline) {
    const partner = partners.get(row.partnerId) ?? { id: row.partnerId, name: row.partnerName, rows: [] };
    partner.rows.push({ unitName: row.unitName, accepted: row.accepted });
    partners.set(row.partnerId, partner);
  }
  const kitAccepted = timeline.filter((row) => row.unitName.trim().toLowerCase() === "kit").reduce((sum, row) => sum + row.accepted, 0);
  return {
    kind,
    id: workspace.id,
    name: workspace.name,
    city: workspace.city,
    totals: totalsFrom(timeline),
    milestone: confirmedMilestone(kitAccepted),
    partners: [...partners.values()]
      .map((partner) => ({ id: partner.id, name: partner.name, totals: totalsFrom(partner.rows) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    timeline,
  };
}

export async function getPublicRecord(ctx: ServiceContext, kind: "group" | "organization", id: string): Promise<PublicRecord | null> {
  if (!isUuid(id)) return null;
  return read(ctx, async (tx) => {
    const [workspace] = await tx`
      select id, name, city, kind from workspaces where id = ${id} and kind = ${kind}
    `;
    if (!workspace) return null;
    const rows = await acceptedRows(tx, kind, id);
    return toRecord(kind, { id: workspace.id as string, name: workspace.name as string, city: workspace.city as string }, rows);
  });
}

export async function getConfirmedReceipts(ctx: ServiceContext, orgId: string): Promise<ReceiptLine[] | "not_allowed" | null> {
  if (!isUuid(orgId)) return null;
  return read(ctx, async (tx) => {
    const [workspace] = await tx`select id, kind from workspaces where id = ${orgId}`;
    if (!workspace || workspace.kind !== "organization") return null;
    const role = await roleIn(tx, orgId, ctx.userId);
    if (!role) return "not_allowed";
    const rows = await acceptedRows(tx, "organization", orgId);
    return rows.map((row) => ({
      id: row.id,
      reviewedAt: row.reviewedAt,
      groupName: row.partnerName,
      accepted: row.acceptedQuantity,
      unitName: row.unitName,
      requestTitle: row.requestTitle,
    }));
  });
}
