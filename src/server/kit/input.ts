import "server-only";

// Everything Kit knows about one need, read fresh from the database. Both the
// Kit page and the AI action build Kit's facts here, so the browser can never
// hand Kit made-up numbers.

import type { KitInput } from "@/domain/kit-helper";
import { countNoun } from "@/domain/text";
import { getRequestDetail, listPublicRequests } from "../queries/requests";
import { viewCount, viewsByDay } from "../queries/reach";
import type { AppContext } from "../next/context";
import { siteUrl } from "../next/supabase";

const DAY = 86_400_000;

export interface KitContext {
  input: KitInput;
  nearbyOrgs: string[];
  requestId: string;
  orgId: string;
  isOrgMember: boolean;
}

/** Null when the need doesn't exist or the person isn't running it (the organization or a group with a drive). */
export async function loadKitContext(ctx: AppContext, requestId: string): Promise<KitContext | null> {
  if (!ctx.user) return null;
  const detail = await getRequestDetail(ctx, requestId);
  if (!detail) return null;
  const { request, org, totals, deadline, viewer } = detail;
  const runsDrive = viewer.memberDriveIds.length > 0 || viewer.adminGroups.some((g) => g.existingCommitmentId);
  if (!viewer.isOrgMember && !runsDrive) return null;

  const [views, week, nearby] = await Promise.all([
    viewCount(ctx, "request", request.id),
    viewsByDay(ctx, "request", request.id, 7),
    listPublicRequests(ctx, { category: request.category, status: "open" }),
  ]);
  const nearbyOrgs = [...new Set(nearby.filter((s) => s.org.id !== org.id).map((s) => s.org.name))];
  const latestUpdate = detail.updates.reduce<number | null>((max, u) => Math.max(max ?? 0, new Date(u.createdAt).getTime()), null);

  return {
    requestId: request.id,
    orgId: org.id,
    isOrgMember: viewer.isOrgMember,
    nearbyOrgs,
    input: {
      orgName: org.name,
      title: request.title,
      category: request.category,
      unitName: request.unitName,
      city: org.city || request.location,
      target: totals.target,
      accepted: totals.accepted,
      promised: totals.promised,
      available: totals.available,
      activeDrives: totals.activeDrives,
      helperGroups: detail.drives.filter((d) => d.status === "active").map((d) => d.groupName),
      neededBy: request.neededBy,
      daysLeft: deadline.daysLeft,
      passed: deadline.passed,
      views,
      viewsLast7: week,
      items: request.requestType === "kit" ? detail.components.map((c) => countNoun(c.quantityPerUnit, c.name).toLowerCase()) : [],
      need: request.need,
      updatesCount: detail.updates.length,
      daysSinceUpdate: latestUpdate === null ? null : Math.floor((Date.now() - latestUpdate) / DAY),
      url: `${siteUrl()}${ctx.base}/requests/${request.id}`,
      asker: viewer.isOrgMember ? "organization" : "group",
      askerName: ctx.user.displayName,
    },
  };
}
