import { cn } from "./cn";
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "inverse";
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white border border-forest hover:bg-forest-dark disabled:bg-sunken disabled:text-muted disabled:border-line",
  secondary: "bg-surface text-forest border border-line-strong hover:bg-forest-tint disabled:text-muted",
  quiet: "bg-transparent text-forest border border-transparent hover:bg-forest-tint disabled:text-muted",
  danger: "bg-surface text-danger border border-danger hover:bg-danger-tint disabled:text-muted",
  inverse: "bg-white text-forest-dark border border-white hover:bg-forest-tint disabled:bg-white/70",
};
export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", full = false) {
  return cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-lg font-sans font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed",
    size === "md" ? "px-5 py-3 text-base" : "px-3 py-2 text-sm", full && "w-full", VARIANT[variant]);
}

