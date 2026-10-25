import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppLink } from "@/components/ui/base";
import { ButtonLink } from "@/components/ui/button";
import { Steps } from "@/components/ui/steps";
import { WorkspaceForm } from "@/components/workspaces/workspace-forms";
import { safeNext, welcomeIntent } from "@/lib/safe-next";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Welcome" };

// Step 3 of sign-up, after the email is confirmed: set up the organization or
// group the person said they came for. Everything here can be skipped.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const next = safeNext(params.next, "/home");
  const intent = welcomeIntent(params.intent);
  // Send people back to where they started (a request, an invitation), not to a default page.
  const returnTo = params.next && !["/drives", "/requests", "/home", "/"].includes(next) ? next : undefined;

  if (!ctx.user) {
    return (
      <AuthShell title="Your email is confirmed" description="Sign in to continue.">
        <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/welcome?next=${encodeURIComponent(next)}${intent ? `&intent=${intent}` : ""}`)}`} full>
          Sign in
        </ButtonLink>
      </AuthShell>
    );
  }

  const name = ctx.user.displayName;
  const steps = ["Who you are", "Your account", intent === "invited" ? "Join" : "Set up"];
  // The adopt page names the group itself, so don't ask twice.
  const adopting = /^\/requests\/[^/]+\/adopt/.test(next);

  if (intent === "organization" || (intent === "group" && !adopting)) {
    const isOrg = intent === "organization";
    return (
      <AuthShell
        title={isOrg ? `Welcome, ${name}. Add your organization` : `Welcome, ${name}. Name your group`}
        description={
          isOrg
            ? "A KitGap reviewer checks new organizations before their requests are listed. You can post your first request right after this."
            : "Then pick a request and start a drive. You can invite members once it's running."
        }
        footer={
          <p>
            <AppLink href={next} className="font-semibold">
              Skip for now
            </AppLink>{" "}
            <span className="text-muted">You can do this later from your home page.</span>
          </p>
        }
      >
        <Steps labels={steps} current={3} />
        <WorkspaceForm
          kind={isOrg ? "organization" : "group"}
          onboarding
          returnTo={returnTo}
          values={isOrg ? { contactName: ctx.user.displayName, contactEmail: ctx.user.email ?? "" } : undefined}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Welcome, ${name}`} description="Your email is confirmed and you're signed in.">
      {intent ? <Steps labels={steps} current={3} /> : null}
      <div className="flex flex-col gap-2">
        <ButtonLink href={next} full>
          {next.startsWith("/join/") ? "Continue to join the group" : adopting ? "Continue to start your drive" : "Continue"}
        </ButtonLink>
        {adopting ? (
          <p className="text-sm text-muted">You&apos;ll name your group on the next page.</p>
        ) : intent === "invited" ? (
          <>
            {next.startsWith("/join/") ? null : (
              <ButtonLink href="/requests" variant="secondary" full>
                Find a need near you
              </ButtonLink>
            )}
            <p className="text-sm text-muted">Sent a link by someone? Open it again and you&apos;ll join their group.</p>
          </>
        ) : (
          <>
            <ButtonLink href="/organization/new" variant="secondary" full>
              Add your organization
            </ButtonLink>
            <ButtonLink href="/requests" variant="secondary" full>
              Find a need near you
            </ButtonLink>
          </>
        )}
      </div>
    </AuthShell>
  );
}
