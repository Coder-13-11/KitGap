// Shared button styles, usable from server and client components.
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-forest text-white border border-forest hover:bg-forest-dark hover:border-forest-dark disabled:bg-[#8aa597] disabled:border-[#8aa597]",
  secondary:
    "bg-surface text-forest border border-line-strong hover:bg-forest-tint disabled:text-muted disabled:bg-sunken",
  quiet: "bg-transparent text-forest border border-transparent hover:bg-forest-tint disabled:text-muted",
  danger: "bg-surface text-danger border border-danger hover:bg-danger-tint disabled:text-muted disabled:border-line-strong",
};

export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", full = false) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold no-underline transition-colors duration-150",
    "disabled:cursor-not-allowed",
    size === "md" ? "min-h-11 px-4 py-2 text-base" : "min-h-9 px-3 py-1.5 text-sm",
    full && "w-full",
    VARIANT[variant],
  );
}

