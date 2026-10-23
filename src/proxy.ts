// Runs before every page request.
//  1. /demo/... URLs are served by the normal pages with a header that tells
//     the server to use the visitor's demo sandbox. The header is removed from
//     every other request, so it can't be forged to reach the demo code path.
//  2. For the real app, the Supabase session cookie is refreshed when needed.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_HEADER = "x-kitgap-demo";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(DEMO_HEADER);

  if (pathname.startsWith("/demo/")) {
    requestHeaders.set(DEMO_HEADER, "1");
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice("/demo".length);
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!url || !key || !hasSession || pathname === "/demo") return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Refreshes an expired access token using the refresh token, if possible.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
