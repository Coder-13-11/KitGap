// Kit's voice: turns a short answer into speech with the kokoro model on the
// AI endpoint. Only for signed-in people and demo visitors. Returns 204 when
// voice isn't available, and the browser's own speech takes over.

import { allowKitUse } from "@/server/kit/usage";
import { kitCaller, voiceAllowed } from "@/server/kit/voice-limit";

export async function POST(request: Request): Promise<Response> {
  const base = process.env.KIT_AI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.KIT_AI_API_KEY;
  const caller = await kitCaller();
  if (!caller) return new Response(null, { status: 401 });
  if (!base || !key || !voiceAllowed(caller, 30) || !(await allowKitUse(caller, "voice"))) return new Response(null, { status: 204 });
  const { text } = (await request.json().catch(() => ({}))) as { text?: unknown };
  const input = typeof text === "string" ? text.trim().slice(0, 400) : "";
  if (!input) return new Response(null, { status: 204 });
  try {
    const res = await fetch(`${base}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.KIT_AI_VOICE_MODEL || "kokoro", input, voice: process.env.KIT_AI_VOICE || "af_heart", response_format: "mp3" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok || !res.body) return new Response(null, { status: 204 });
    return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
