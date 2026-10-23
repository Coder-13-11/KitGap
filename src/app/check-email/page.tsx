import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendConfirmationForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthShell
      title="Check your email"
      description={
        <>
          Your account was created. We sent a confirmation link to <strong className="text-ink">{email || "your email address"}</strong>.
          Open it to finish signing up; you can't sign in until the address is confirmed.
        </>
      }
      footer={
        <p>
          Wrong address? <AppLink href="/sign-up">Create the account again</AppLink>
        </p>
      }
    >
      <div className="space-y-2 text-[0.95rem]">
        <p className="font-semibold">Didn't get it?</p>
        <p className="text-muted">Check your spam folder. Links can take a minute to arrive.</p>
      </div>
      <ResendConfirmationForm email={email} />
    </AuthShell>
  );
}
