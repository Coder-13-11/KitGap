import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";
import { Notice } from "@/components/ui/notice";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const ctx = await getAppContext();
  return (
    <AuthShell title="Choose a new password">
      {ctx.user ? (
        <NewPasswordForm />
      ) : (
        <Notice tone="warning" title="This link has expired">
          Password reset links work once and expire after an hour.{" "}
          <AppLink href="/forgot-password" className="font-semibold">
            Request a new link
          </AppLink>
          .
        </Notice>
      )}
    </AuthShell>
  );
}
