// Shared button styles, usable from server and client components.
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "inverse";

// The punched hole of a shipping tag, on buttons that commit. It's dropped
// when the button already starts with an icon, so a label never opens with
// two marks.
const TAG_HOLE =
  "relative before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-full before:content-[''] has-[svg]:before:hidden";

const VARIANT: Record<ButtonVariant, string> = {
  primary: cn(
    TAG_HOLE,
    "rounded-[2px_8px_8px_2px] bg-forest text-white border border-forest before:bg-paper",
    "hover:bg-forest-dark hover:border-forest-dark",
    "disabled:bg-sunken disabled:text-muted disabled:border-line-strong disabled:before:bg-paper",
  ),
  secondary: cn(
    "rounded-[2px_8px_8px_2px] bg-surface text-forest border border-line-strong",
    "hover:bg-forest-tint",
    "disabled:text-muted disabled:bg-sunken",
  ),
  quiet: "rounded-md bg-transparent text-forest border border-transparent hover:bg-forest-tint disabled:text-muted",
  danger: cn(
    "rounded-[2px_8px_8px_2px] bg-surface text-danger border border-danger",
    "hover:bg-danger-tint",
    "disabled:text-muted disabled:border-line-strong",
  ),
  inverse: cn(
    TAG_HOLE,
    "rounded-[2px_8px_8px_2px] bg-white text-forest-dark border border-white before:bg-forest",
    "hover:bg-forest-tint",
    "disabled:bg-white/70",
  ),
};

export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", full = false) {
  const holed = variant === "primary" || variant === "inverse";
  const holePad = !holed
    ? ""
    : size === "md"
      ? "pl-[1.65rem] before:left-2.5 before:size-2 has-[svg]:pl-4"
      : "pl-6 before:left-2 before:size-1.5 has-[svg]:pl-3";
  return cn(
    "inline-flex items-center justify-center gap-2 font-sans font-semibold no-underline transition-colors duration-150",
    "disabled:cursor-not-allowed",
    size === "md" ? "min-h-11 px-4 py-2 text-base" : "min-h-9 px-3 py-1.5 text-sm",
    holePad,
    full && "w-full",
    VARIANT[variant],
  );
}
