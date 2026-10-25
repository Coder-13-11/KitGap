import "server-only";

// A small per-visitor limit on Kit's voice routes, so the AI key can't be
// used as a free speech service. In memory: resets when the server restarts.

const recent = new Map<string, number[]>();

export function voiceAllowed(request: Request, perMinute = 20): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const times = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= perMinute) return false;
  times.push(now);
  recent.set(key, times);
  if (recent.size > 5000) recent.clear();
  return true;
}
