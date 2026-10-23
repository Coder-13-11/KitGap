import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";
import { safeNext } from "@/lib/safe-next";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  if (ctx.mode === "demo") redirect("/demo");
  const next = safeNext(params.next);
  if (ctx.user) redirect(next);
  return (
    <AuthShell
      title="Create an account"
      description="One account works for everything: running drives with your groups, pledging, and posting requests for an organization."
      footer={
        <p>
          Already have an account?{" "}
          <AppLink href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold">
            Sign in
          </AppLink>
        </p>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
