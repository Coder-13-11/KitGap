"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { usePendingContext } from "./use-action-submit";
import { AppLink } from "./base";
import { buttonClass, type ButtonVariant } from "./button-class";
import { cn } from "./cn";

export { buttonClass, type ButtonVariant } from "./button-class";

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  pending = false,
  pendingLabel,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  full?: boolean;
  pending?: boolean;
  pendingLabel?: string;
}) {
  return (
    <button
      type={props.type ?? "button"}
      className={cn(buttonClass(variant, size, full), className)}
      disabled={props.disabled || pending}
      aria-disabled={props.disabled || pending || undefined}
      {...props}
    >
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

// A submit button that disables itself while its form is being saved, so a
// second click can't send the same thing twice.
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: Omit<Parameters<typeof Button>[0], "type" | "pending"> & { children: ReactNode }) {
  const status = useFormStatus();
  const fromContext = usePendingContext();
  const pending = fromContext ?? status.pending;
  return (
    <Button type="submit" pending={pending} pendingLabel={pendingLabel} {...props}>
      {children}
    </Button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  full = false,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AppLink href={href} className={cn(buttonClass(variant, size, full), className)}>
      {children}
    </AppLink>
  );
}
