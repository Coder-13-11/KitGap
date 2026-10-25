"use client";

// Voice for Kit. Listening records a short question and stops by itself after
// a moment of silence; the server turns it into text (whisper). Speaking plays
// Kit's short answer (kokoro), or the browser's own voice if that isn't
// available. Nothing is recorded until the person taps the microphone.

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "speaking";

const SILENCE_MS = 1400;
const MAX_MS = 15_000;

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export function useVoice({ onText, onError }: { onText: (text: string) => void; onError: (message: string) => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setState((s) => (s === "speaking" ? "idle" : s));
  }, []);

  useEffect(() => () => {
    stopRef.current();
    stopSpeaking();
  }, [stopSpeaking]);

  const listen = useCallback(async () => {
    if (state === "listening") {
      stopRef.current();
      return;
    }
    stopSpeaking();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      onError("I can't hear you. Allow the microphone for this site, or type your question.");
      return;
    }
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    // Stop after a moment of quiet once the person has started talking.
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const started = performance.now();
    let heard = false;
    let quietSince = performance.now();
    let frame = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      void audioCtx.close();
      setLevel(0);
    };
    stopRef.current = finish;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 6));
      const now = performance.now();
      if (rms > 0.035) {
        heard = true;
        quietSince = now;
      }
      if ((heard && now - quietSince > SILENCE_MS) || now - started > MAX_MS || (!heard && now - started > 6000)) {
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    recorder.onstop = async () => {
      if (!heard || chunks.length === 0) {
        setState("idle");
        onError("I didn't hear anything. Tap the microphone and ask again.");
        return;
      }
      setState("transcribing");
      const body = new FormData();
      body.append("audio", new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      try {
        const res = await fetch("/api/kit/transcribe", { method: "POST", body });
        const json = (await res.json()) as { text?: string; error?: string };
        setState("idle");
        if (json.text) onText(json.text);
        else onError(json.error ?? "I couldn't hear that clearly. Try again or type it.");
      } catch {
        setState("idle");
        onError("I couldn't hear that clearly. Try again or type it.");
      }
    };

    recorder.start(250);
    setState("listening");
    frame = requestAnimationFrame(tick);
  }, [state, onText, onError, stopSpeaking]);

  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    if (!text) return;
    setState("speaking");
    try {
      const res = await fetch("/api/kit/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (res.status === 200) {
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setState("idle");
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to the browser's voice.
    }
    if (typeof speechSynthesis !== "undefined") {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.03;
      u.onend = () => setState("idle");
      speechSynthesis.speak(u);
    } else {
      setState("idle");
    }
  }, [stopSpeaking]);

  return { state, level, listen, speak, stopSpeaking };
}
