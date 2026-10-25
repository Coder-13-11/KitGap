// Supabase Auth clients for server code. Only authentication goes through
// Supabase's client library; all KitGap data is read through src/server.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  }
  return { url, key };
}

export async function createSupabaseServerClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session on the next request instead.
        }
      },
    },
  });
}

export function hasAuthCookie(names: string[]): boolean {
  return names.some((name) => name.startsWith("sb-") && name.includes("-auth-token"));
}

// The public address used in emails, share links and QR codes. Set
// NEXT_PUBLIC_SITE_URL; on Vercel, the project's production domain is the
// fallback, so a missing setting never sends people to localhost.
export function siteUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}
