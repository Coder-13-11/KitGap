// Kit's ears: turns a short recording into text with whisper on the AI
// endpoint. The audio is passed straight through and never stored.

import { voiceAllowed } from "@/server/kit/voice-limit";

const MAX_BYTES = 3_000_000; // about a minute of compressed speech

export async function POST(request: Request): Promise<Response> {
  const base = process.env.KIT_AI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.KIT_AI_API_KEY;
  if (!base || !key) return Response.json({ error: "Voice isn't set up here." }, { status: 503 });
  if (!voiceAllowed(request)) return Response.json({ error: "Too many voice questions. Wait a minute." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "I didn't catch any audio." }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "That was a bit long. Try a shorter question." }, { status: 413 });
  const out = new FormData();
  out.append("model", process.env.KIT_AI_STT_MODEL || "whisper-large-v3");
  out.append("language", "en");
  out.append("file", audio, audio.type.includes("mp4") ? "question.mp4" : "question.webm");
  try {
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return Response.json({ error: "I couldn't hear that clearly. Try again or type it." }, { status: 502 });
    const data = (await res.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim().slice(0, 500) });
  } catch {
    return Response.json({ error: "I couldn't hear that clearly. Try again or type it." }, { status: 502 });
  }
}
