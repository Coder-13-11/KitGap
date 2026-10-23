// CSV download of a drive's supplies, pledges and received entries, for
// coordinators who keep their own spreadsheet.

import type { NextRequest } from "next/server";
import { getDriveWorkspace } from "@/server/queries/drives";
import { getAppContext } from "@/server/next/context";

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Stop spreadsheet apps from treating cell text as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (!ctx.user) return new Response("Sign in to download this file.", { status: 401 });
  const drive = await getDriveWorkspace(ctx, id);
  if (!drive || drive === "not_allowed" || drive.role !== "coordinator") {
    return new Response("Only the drive's coordinators can download this file.", { status: 403 });
  }
  const rows: unknown[][] = [
    ["Section", "Item", "Needed", "Collected (usable)", "Not usable", "Pledged, on the way", "Still needed", "Surplus"],
    ...drive.progress.components.map((c) => ["Supplies", c.name, c.needed, c.collected, c.unusable, c.openPledged, c.uncovered, c.surplus]),
    [],
    ["Section", "Item", "Pledged", "Received", "Still to come", "Status", "Contributor", "Note"],
    ...drive.pledges.map((p) => ["Pledge", p.componentName, p.quantity, p.received, p.outstanding, p.status, p.contributorName, p.note]),
    [],
    ["Section", "Item", "Usable", "Not usable", "From pledge", "Recorded by", "Recorded at", "Removed", "Note"],
    ...drive.collections.map((c) => ["Received", c.componentName, c.usable, c.unusable, c.fromPledge ? "yes" : "no", c.recordedByName, c.createdAt.toISOString(), c.voided ? "yes" : "no", c.note]),
  ];
  const filename = `kitgap-drive-${drive.commitment.id.slice(0, 8)}.csv`;
  return new Response("﻿" + csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
