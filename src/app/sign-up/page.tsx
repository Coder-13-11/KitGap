import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpFlow } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";
import { safeNext, welcomeIntent } from "@/lib/safe-next";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  if (ctx.mode === "demo") redirect("/demo");
  const next = safeNext(params.next);
  if (ctx.user) redirect(next);
  // Someone arriving from an invitation link already knows why they're here.
  const intent = next.startsWith("/join/") ? "invited" : (welcomeIntent(params.as) ?? undefined);
  return (
    <AuthShell
      title="Create an account"
      description="It takes about two minutes. One account works for everything: finding needs, helping, and posting what your organization needs."
      footer={
        <p>
          Already have an account?{" "}
          <AppLink href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold">
            Sign in
          </AppLink>
        </p>
      }
    >
      <SignUpFlow next={next} initialIntent={intent} />
    </AuthShell>
  );
}
