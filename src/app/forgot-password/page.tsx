import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AppLink } from "@/components/ui/base";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email address you signed up with. We'll send a link to choose a new password."
      footer={<AppLink href="/sign-in">Back to sign in</AppLink>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
