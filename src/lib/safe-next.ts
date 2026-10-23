// Only same-site paths are allowed as "return to" destinations, so a crafted
// sign-in link can't send someone to another website afterwards.
export function safeNext(value: string | null | undefined, fallback = "/drives"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return fallback;
  if (value.startsWith("/demo")) return fallback;
  return value;
}

// A path inside the demo, given without its "/demo" prefix.
export function safeDemoPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.startsWith("/demo/") ? value.slice(5) : value;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\r\n]/.test(path)) return null;
  return path;
}
