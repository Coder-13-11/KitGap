import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ButtonLink } from "@/components/ui/button";
import { safeNext } from "@/lib/safe-next";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const next = safeNext(params.next, "/requests");
  return (
    <AuthShell
      title={ctx.user ? `Welcome, ${ctx.user.displayName}` : "Your email is confirmed"}
      description={ctx.user ? "Your email is confirmed and you're signed in." : "Sign in to continue."}
    >
      <div className="flex flex-col gap-2">
        {ctx.user ? (
          <>
            <ButtonLink href={next} full>
              Continue
            </ButtonLink>
            <ButtonLink href="/organization/new" variant="secondary" full>
              Register an organization
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href={`/sign-in?next=${encodeURIComponent(next)}`} full>
            Sign in
          </ButtonLink>
        )}
      </div>
    </AuthShell>
  );
}
