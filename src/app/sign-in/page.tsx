import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";
import { Notice } from "@/components/ui/notice";
import { safeNext } from "@/lib/safe-next";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  adopt: "Sign in to start a drive. You'll come back to the request with the quantity you chose, and availability is checked again.",
  join: "Sign in to accept the invitation.",
  organization: "Sign in or create an account to register your organization.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  if (ctx.mode === "demo") redirect("/demo");
  const next = safeNext(params.next);
  if (ctx.user) redirect(next);
  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          <p>
            New to KitGap?{" "}
            <AppLink href={`/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold">
              Create an account
            </AppLink>
          </p>
          <p>
            <AppLink href="/forgot-password">Forgot your password?</AppLink>
          </p>
        </>
      }
    >
      {params.expired || ctx.sessionExpired ? (
        <Notice tone="warning" title="Your session expired">
          Sign in again to continue where you left off.
        </Notice>
      ) : null}
      {params.error === "link" ? (
        <Notice tone="warning" title="That link didn't work">
          It may have expired or already been used. If you were confirming your email, try signing in; if that doesn't work, request a new
          link.
        </Notice>
      ) : null}
      {params.reason && REASONS[params.reason] ? <Notice tone="info">{REASONS[params.reason]}</Notice> : null}
      <SignInForm next={next} defaultEmail={params.email} />
    </AuthShell>
  );
}
