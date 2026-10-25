import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { PostCard } from "@/components/site/og-art";
import { countNoun, formatCount } from "@/domain/text";
import { formatCalendarDate } from "@/domain/dates";
import { getRequestDetail } from "@/server/queries/requests";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";

// The square post for a need (1080×1080), with a QR code to its page.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const detail = await getRequestDetail(ctx, id).catch(() => null);
  if (!detail || !["published", "closed"].includes(detail.request.status)) {
    return new Response("Not found", { status: 404 });
  }
  const { request, org, totals } = detail;
  const url = `${siteUrl()}${ctx.base}/requests/${request.id}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: "#1c2921", light: "#fbf6ec" } });
  const still = totals.available + Math.max(0, totals.promised - totals.accepted);
  const headline = still > 0 ? `${formatCount(totals.target - totals.accepted)} more ${countNoun(2, request.unitName).replace(/^2 /, "")}` : "Almost there";
  return new ImageResponse(
    (
      <PostCard
        orgName={org.name}
        title={request.title}
        headline={headline}
        detail={`${formatCount(totals.accepted)} of ${countNoun(totals.target, request.unitName)} confirmed${request.neededBy ? ` · needed by ${formatCalendarDate(request.neededBy)}` : ""}`}
        confirmed={totals.accepted}
        promised={totals.promised}
        target={totals.target}
        qr={qr}
      />
    ),
    { width: 1080, height: 1080, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
