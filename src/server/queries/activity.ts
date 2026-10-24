// The activity log, turned into short sentences: who did what, and when.

import { IMPORT_SOURCE_LABEL, type ImportSource } from "@/domain/import";
import { countNoun, formatCount, listPhrase } from "@/domain/text";
import type { Tx } from "../db/client";

export interface ActivityItem {
  id: string;
  kind: string;
  actorName: string;
  text: string;
  createdAt: Date;
  context: string | null; // group or request name when listing across drives
}

interface Row {
  id: string;
  kind: string;
  actorId: string | null;
  actorName: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
  groupName: string | null;
  requestTitle: string | null;
  unitName: string | null;
}

const FIELD_LABEL: Record<string, string> = {
  need: "the description",
  beneficiaries: "who it helps",
  conditionNotes: "accepted condition",
  substitutions: "substitutions",
  location: "location",
  handoverInstructions: "handover instructions",
  coordinatorContact: "coordinator contact",
  fundraisingUrl: "fundraising link",
};

export function describeActivity(kind: string, data: Record<string, unknown>, unit: string, group: string | null): string {
  const n = (key: string) => Number(data[key] ?? 0);
  const units = (key: string) => countNoun(n(key), unit);
  const item = () => countNoun(n("quantity"), String(data.component ?? "item"));
  const groupName = group ?? "A group";
  switch (kind) {
    case "request.created":
      return data.copiedFrom ? "copied the request into a new draft" : "created the draft";
    case "request.submitted":
      return "submitted the request for review";
    case "request.returned":
      return `returned the request for changes: “${String(data.note ?? "")}”`;
    case "request.published":
      return "approved and published the request";
    case "request.closed":
      return data.note ? `closed the request to new drives: “${String(data.note)}”` : "closed the request to new drives";
    case "request.reopened":
      return "reopened the request to new drives";
    case "request.cancelled":
      return `cancelled the request: “${String(data.note ?? "")}”`;
    case "request.details_updated": {
      const fields = Array.isArray(data.fields) ? (data.fields as string[]).map((f) => FIELD_LABEL[f] ?? f) : [];
      return `updated ${listPhrase(fields) || "the request details"}`;
    }
    case "request.update_posted":
      return "posted an update";
    case "drive.started":
      return `started a drive for ${units("quantity")} (${groupName})`;
    case "drive.quantity_changed":
      return `changed ${groupName}'s drive from ${n("from")} to ${countNoun(n("to"), unit)}`;
    case "drive.withdrawn": {
      const pending = n("pendingReview");
      const base = `withdrew ${groupName}'s drive, releasing ${units("released")}`;
      return pending > 0 ? `${base}; ${units("pendingReview")} still awaiting review` : base;
    }
    case "pledge.created":
      return `pledged ${item()}`;
    case "pledge.withdrawn":
      return `withdrew a pledge for ${String(data.component ?? "an item")}`;
    case "pledge.released":
      return `closed an unfulfilled pledge for ${String(data.component ?? "an item")}`;
    case "pledges.imported": {
      const from = IMPORT_SOURCE_LABEL[data.source as ImportSource] ?? "a spreadsheet";
      const over = n("overCap") > 0 ? `; left out ${countNoun(n("overCap"), "row")} asking for more than was still needed` : "";
      return `imported ${countNoun(n("count"), "pledge")} (${formatCount(n("quantity"))} items) from ${from}${over}`;
    }
    case "collection.recorded": {
      const usable = countNoun(n("usable"), String(data.component ?? "item"));
      const unusable = n("unusable") > 0 ? `, plus ${n("unusable")} not usable` : "";
      return `recorded ${usable} received${unusable}`;
    }
    case "collection.voided":
      return `removed an entry of ${countNoun(n("usable"), String(data.component ?? "item"))}: “${String(data.reason ?? "")}”`;
    case "kits.packed":
      return `packed ${units("quantity")}`;
    case "kits.unpacked":
      return `unpacked ${units("quantity")}`;
    case "kits.repaired":
      return `marked ${units("quantity")} fixed and ready again`;
    case "kits.set_aside":
      return `set aside ${units("quantity")} that were not accepted`;
    case "delivery.submitted":
      return `reported handing over ${units("quantity")}`;
    case "delivery.cancelled":
      return `took back a delivery report of ${units("quantity")}`;
    case "delivery.reviewed": {
      const accepted = n("accepted");
      const notAccepted = n("notAccepted");
      if (notAccepted === 0) return `confirmed receiving ${countNoun(accepted, unit)} from ${groupName}`;
      return `accepted ${accepted} of ${countNoun(n("quantity"), unit)} from ${groupName}; ${notAccepted} not accepted: “${String(data.note ?? "")}”`;
    }
    case "member.joined":
      return "joined";
    case "workspace.created":
      return "created the workspace";
    case "workspace.contact_confirmed":
      return "confirmed the organization's contact";
    case "workspace.contact_unconfirmed":
      return "removed the contact confirmation";
    default:
      return "made a change";
  }
}

export async function activityFor(
  tx: Tx,
  options: {
    commitmentId?: string;
    requestId?: string;
    workspaceId?: string;
    requestIds?: string[];
    audiences: ("org" | "group" | "both")[];
    showNames: boolean;
    viewerId: string | null;
    limit: number;
  },
): Promise<ActivityItem[]> {
  const rows = (await tx`
    select a.id, a.kind, a.actor_id, p.display_name as actor_name, a.data, a.created_at,
           g.name as group_name, r.title as request_title, r.unit_name
    from activity a
    left join profiles p on p.id = a.actor_id
    left join commitments c on c.id = a.commitment_id
    left join workspaces g on g.id = c.group_id
    left join requests r on r.id = a.request_id
    where a.audience in ${tx(options.audiences)}
      and (${options.commitmentId ?? null}::uuid is null or a.commitment_id = ${options.commitmentId ?? null})
      and (${options.requestId ?? null}::uuid is null or a.request_id = ${options.requestId ?? null})
      and (${options.workspaceId ?? null}::uuid is null or a.workspace_id = ${options.workspaceId ?? null})
      and (${options.requestIds ? true : false} = false or a.request_id = any(${options.requestIds ?? []}::uuid[]))
    order by a.id desc
    limit ${options.limit}
  `) as unknown as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind,
    actorName:
      row.actorId && row.actorId === options.viewerId
        ? "You"
        : options.showNames
          ? row.actorName ?? "Someone"
          : "A member",
    text: describeActivity(row.kind, row.data ?? {}, row.unitName ?? "unit", row.groupName),
    createdAt: row.createdAt,
    context: options.commitmentId ? null : row.requestTitle,
  }));
}

// "Updates": recent activity in every workspace the person belongs to, from
// other people. Contributors see their group's events without other
// members' names, the same as on the drive page.
export async function updatesFor(
  tx: Tx,
  userId: string,
  options: { limit: number },
): Promise<{ items: (ActivityItem & { link: string | null; unread: boolean })[]; unread: number }> {
  const [profile] = await tx`select coalesce(updates_seen_at, created_at) as seen from profiles where id = ${userId}`;
  const seen: Date = profile?.seen ?? new Date(0);
  const rows = (await tx`
    with mine as (
      select m.workspace_id, m.role, w.kind from workspace_members m join workspaces w on w.id = m.workspace_id
      where m.user_id = ${userId}
    )
    select a.id, a.kind, a.actor_id, p.display_name as actor_name, a.data, a.created_at, a.commitment_id,
           g.name as group_name, r.title as request_title, r.unit_name, r.id as request_id, r.org_id,
           (select role from mine where mine.workspace_id = c.group_id) as group_role,
           exists (select 1 from mine where mine.workspace_id = r.org_id) as in_org
    from activity a
    left join profiles p on p.id = a.actor_id
    left join commitments c on c.id = a.commitment_id
    left join workspaces g on g.id = c.group_id
    left join requests r on r.id = a.request_id
    where a.actor_id is distinct from ${userId}
      and (
        (a.audience in ('org', 'both') and r.org_id in (select workspace_id from mine where kind = 'organization'))
        or (a.audience in ('group', 'both') and c.group_id in (select workspace_id from mine where kind = 'group'))
      )
    order by a.id desc
    limit ${options.limit}
  `) as unknown as (Row & {
    commitmentId: string | null;
    requestId: string | null;
    orgId: string | null;
    groupRole: "admin" | "member" | null;
    inOrg: boolean;
  })[];
  const [{ count }] = await tx`
    with mine as (
      select m.workspace_id, w.kind from workspace_members m join workspaces w on w.id = m.workspace_id where m.user_id = ${userId}
    )
    select count(*)::int as count from activity a
    left join commitments c on c.id = a.commitment_id
    left join requests r on r.id = a.request_id
    where a.actor_id is distinct from ${userId} and a.created_at > ${seen}
      and (
        (a.audience in ('org', 'both') and r.org_id in (select workspace_id from mine where kind = 'organization'))
        or (a.audience in ('group', 'both') and c.group_id in (select workspace_id from mine where kind = 'group'))
      )
  `;
  return {
    unread: Number(count),
    items: rows.map((row) => {
      const contributorView = row.groupRole === "member" && !row.inOrg;
      const link = row.commitmentId && row.groupRole
        ? `/drives/${row.commitmentId}`
        : row.requestId && row.inOrg
          ? `/organization/${row.orgId}/requests/${row.requestId}`
          : row.requestId
            ? `/requests/${row.requestId}`
            : null;
      return {
        id: String(row.id),
        kind: row.kind,
        actorName: contributorView ? "A member" : row.actorName ?? "Someone",
        text: describeActivity(row.kind, row.data ?? {}, row.unitName ?? "unit", row.groupName),
        createdAt: row.createdAt,
        context: row.requestTitle,
        link,
        unread: row.createdAt > seen,
      };
    }),
  };
}
