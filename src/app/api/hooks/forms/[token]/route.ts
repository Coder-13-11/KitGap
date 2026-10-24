import { NextResponse } from "next/server";
import { isDomainError } from "@/domain/errors";
import { db, LIVE_SCHEMA } from "@/server/db/client";
import { ingestFormWebhook } from "@/server/services/webhooks";

export const runtime = "nodejs";

// Public: Google Apps Script posts here. The body is a form response. We never
// echo names, emails or answers back.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await ingestFormWebhook({ sql: db(), schema: LIVE_SCHEMA, userId: null }, token, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDomainError(error)) {
      if (error.code === "not_found") return NextResponse.json({ ok: false }, { status: 404 });
      if (error.code === "closed") return NextResponse.json({ ok: false }, { status: 410 });
      if (error.code === "conflict") return NextResponse.json({ ok: false }, { status: 429 });
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    console.error("[kitgap] form webhook failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
