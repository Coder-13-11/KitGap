// Where confirmation and password-reset emails land. Verifies the one-time
// token with Supabase Auth (which signs the person in), then sends them on.

import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseServerClient } from "@/server/next/supabase";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const cookieStore = await cookies();
  const next = safeNext(params.get("next") ?? cookieStore.get("kg_next")?.value ?? null, "/requests");
  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) redirect("/sign-in?error=link");
  cookieStore.delete("kg_next");
  if (type === "recovery" || next === "/reset-password") redirect("/reset-password");
  redirect(`/welcome?next=${encodeURIComponent(next)}`);
}
