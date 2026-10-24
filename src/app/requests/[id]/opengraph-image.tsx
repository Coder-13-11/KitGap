import { ImageResponse } from "next/og";
import { countNoun, formatCount } from "@/domain/text";
import { formatCalendarDate } from "@/domain/dates";
import { getRequestDetail } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { OG_SIZE, OgBar, OgFrame } from "@/components/site/og-art";

export const alt = "A request on KitGap";
export const size = OG_SIZE;
export const contentType = "image/png";

const LISTED = new Set(["published", "closed"]);

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRequestDetail(await getAppContext(), id).catch(() => null);

  if (!detail || !LISTED.has(detail.request.status)) {
    return new ImageResponse(
      (
        <OgFrame footer="Organizations post exact needs. Groups collect them.">
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>A request on KitGap</div>
        </OgFrame>
      ),
      size,
    );
  }

  const { request, org, totals } = detail;
  const open = totals.available;
  return new ImageResponse(
    (
      <OgFrame footer={`Needed by ${formatCalendarDate(request.neededBy)} · ${request.location}`}>
        <div style={{ display: "flex", fontSize: 30, color: "#5b625e" }}>Requested by {org.name}</div>
        <div style={{ display: "flex", fontSize: request.title.length > 60 ? 56 : 68, fontWeight: 700, lineHeight: 1.1, marginTop: 12, maxWidth: 1060 }}>
          {request.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44 }}>
          <OgBar confirmed={totals.accepted} promised={totals.promised} max={totals.target} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <div style={{ display: "flex" }}>
              {formatCount(totals.accepted)} of {countNoun(totals.target, request.unitName)} confirmed · {formatCount(totals.promised)} promised
            </div>
            <div style={{ display: "flex", fontWeight: 700, color: "#234d3b" }}>
              {open > 0 ? `${formatCount(open)} still open for groups` : "Fully promised"}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
