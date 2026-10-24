// Only same-site paths are allowed as "return to" destinations, so a crafted
// sign-in link can't send someone to another website afterwards.
export function safeNext(value: string | null | undefined, fallback = "/home"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return fallback;
  if (value.startsWith("/demo")) return fallback;
  return value;
}

export const INTENT_COOKIE = "kg_intent";

export type WelcomeIntent = "organization" | "group" | "invited";

/** What someone said brought them here at sign-up, or null if it isn't one of the choices. */
export function welcomeIntent(value: string | null | undefined): WelcomeIntent | null {
  return value === "organization" || value === "group" || value === "invited" ? value : null;
}

// A path inside the demo, given without its "/demo" prefix.
export function safeDemoPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.startsWith("/demo/") ? value.slice(5) : value;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\r\n]/.test(path)) return null;
  return path;
}
