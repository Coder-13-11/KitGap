"use server";

// Sign-up, sign-in, password reset and sign-out, using Supabase Auth's
// email-and-password flows. Messages never reveal whether an email address
// has an account (sign-up and reset show the same response either way).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseServerClient, siteUrl } from "@/server/next/supabase";

const NEXT_COOKIE = "kg_next"; // read back by /auth/confirm

function fail(message: string, fieldErrors: Record<string, string> = {}, code = "invalid_input"): ActionResult<never> {
  return { ok: false, code, message, fieldErrors };
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyAuthError(error: { code?: string; message: string; status?: number }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match an account. Check them and try again, or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email address first. We sent you a link when you created your account.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts in a short time. Wait a few minutes and try again.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, not a common word.";
    case "same_password":
      return "Choose a password that's different from your current one.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "signup_disabled":
      return "New accounts can't be created right now.";
    default:
      console.error("[kitgap] auth error", error.code, error.status);
      return "We couldn't complete that just now. Please try again in a moment.";
  }
}

export async function signInAction(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const email = text(formData, "email");
  const password = formData.get("password");
  const next = safeNext(text(formData, "next"));
  const fieldErrors: Record<string, string> = {};
  if (!EMAIL.test(email)) fieldErrors.email = "Enter your email address, like name@example.com";
  if (typeof password !== "string" || password.length === 0) fieldErrors.password = "Enter your password";
  if (Object.keys(fieldErrors).length) return fail("Some answers need attention.", fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: password as string });
  if (error) {
    const message = friendlyAuthError(error);
    return fail(message, {}, error.code === "email_not_confirmed" ? "email_not_confirmed" : "auth");
  }
  redirect(next);
}

export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = formData.get("password");
  const next = safeNext(text(formData, "next"));
  const fieldErrors: Record<string, string> = {};
  if (name.length < 1) fieldErrors.name = "Enter your name";
  else if (name.length > 80) fieldErrors.name = "Keep your name to 80 characters or fewer";
  if (!EMAIL.test(email)) fieldErrors.email = "Enter an email address, like name@example.com";
  if (typeof password !== "string" || password.length < 8) fieldErrors.password = "Use at least 8 characters";
  else if (password.length > 72) fieldErrors.password = "Use 72 characters or fewer";
  if (Object.keys(fieldErrors).length) return fail("Some answers need attention.", fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password as string,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm`, data: { display_name: name } },
  });
  if (error) return fail(friendlyAuthError(error), {}, "auth");

  const cookieStore = await cookies();
  cookieStore.set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24, path: "/" });
  if (data.session) redirect(next);
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendConfirmationAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ sent: true }>> {
  const email = text(formData, "email");
  if (!EMAIL.test(email)) return fail("Enter the email address you signed up with.", { email: "Enter a valid email address" });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl()}/auth/confirm` } });
  if (error && error.code !== "user_already_exists") return fail(friendlyAuthError(error), {}, "auth");
  return { ok: true, data: { sent: true } };
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ sent: true }>> {
  const email = text(formData, "email");
  if (!EMAIL.test(email)) return fail("Some answers need attention.", { email: "Enter your email address, like name@example.com" });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return fail(friendlyAuthError(error), {}, "auth");
  }
  return { ok: true, data: { sent: true } };
}

export async function updatePasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8) {
    return fail("Some answers need attention.", { password: "Use at least 8 characters" });
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return fail("This reset link has expired or was already used. Request a new one.", {}, "sign_in_required");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(friendlyAuthError(error), {}, "auth");
  redirect("/account?updated=password");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/?signed_out=1");
}

