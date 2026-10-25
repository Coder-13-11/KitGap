"use client";

// Kit, the personal assistant, on every page: a button in the bottom right
// that opens a chat. Kit checks for news every minute while the page is open
// (deliveries to review, deadlines, needs nobody has seen, new updates),
// shows a badge, and greets the person with what matters. Ask by typing or
// by voice; Kit answers with buttons that go straight to the right page.

import { ArrowRight, ArrowUp, Mic, Square, Volume2, VolumeX, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { askKitAssistantAction, kitSnapshotAction, type KitSnapshotView } from "@/actions/kit-assistant";
import { LogoMark } from "../site/logo";
import { AppLink } from "../ui/base";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";
import { useVoice, voiceSupported } from "./use-voice";

interface Message {
  id: number;
  from: "me" | "kit";
  text: string;
  actions?: { href: string; label: string }[];
}

const REFRESH_MS = 60_000;
const noSubscribe = () => () => {};
const SEEN_KEY = "kitgap-kit-seen";

function readSeen(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function KitLauncher({ ai }: { ai: boolean }) {
  const pathname = usePathname();
  const hidden = /\/requests\/[^/]+\/kit$/.test(pathname);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<KitSnapshotView | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const canVoice = useSyncExternalStore(noSubscribe, voiceSupported, () => false);

  // Keep Kit's snapshot fresh: on each page, every minute, and when the tab comes back.
  const refresh = useCallback(async () => {
    const s = await kitSnapshotAction(pathname).catch(() => null);
    if (!s) return;
    setSnapshot(s);
    const seen = readSeen();
    const fresh = s.nudges.find((n) => n.urgency === "now" && !seen.includes(n.id));
    if (fresh) setTeaser(fresh.text);
  }, [pathname]);

  useEffect(() => {
    if (hidden) return;
    // refresh() sets state only after its server call returns, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, hidden]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking, open]);

  const push = (m: Omit<Message, "id">) => setMessages((list) => [...list, { ...m, id: nextId.current++ }]);

  const voice = useVoice({
    onText: (text) => void ask(text, true),
    onError: (message) => push({ from: "kit", text: message }),
  });

  const ask = async (question: string, spoken = false) => {
    const q = question.trim();
    if (!q || thinking) return;
    const history = messagesRef.current.slice(-6).map((m) => ({ from: m.from, text: m.text }));
    push({ from: "me", text: q });
    setThinking(true);
    let reply: Awaited<ReturnType<typeof askKitAssistantAction>>;
    try {
      [reply] = await Promise.all([askKitAssistantAction({ question: q, path: pathname, history }), new Promise((r) => setTimeout(r, 450))]);
    } catch {
      reply = { error: "I couldn't connect. Check your internet and try again." };
    }
    setThinking(false);
    if ("error" in reply) {
      push({ from: "kit", text: reply.error });
      return;
    }
    push({ from: "kit", text: reply.text, actions: reply.actions });
    if (spoken || voiceOn) {
      if (spoken && !voiceOn) setVoiceOn(true);
      void voice.speak(reply.speak);
    }
  };

  const openPanel = () => {
    setOpen(true);
    setTeaser(null);
    if (snapshot) {
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), ...snapshot.nudges.map((n) => n.id)])]));
      } catch {
        // Private browsing: the teaser may show again, which is fine.
      }
    }
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  const close = () => {
    setOpen(false);
    voice.stopSpeaking();
    launcherRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads refs and stable setters
  }, [open]);

  if (hidden) return null;

  const nudges = snapshot?.nudges ?? [];
  const badge = nudges.filter((n) => n.urgency !== "info").length || nudges.length;
  const hour = new Date().getHours();
  const hello = `${hour < 12 ? "Morning" : hour < 17 ? "Hi" : "Evening"}${snapshot?.firstName ? `, ${snapshot.firstName}` : ""}.`;
  const need = snapshot?.pageNeed ?? snapshot?.myNeeds[0] ?? null;
  const suggestions = snapshot?.signedIn
    ? ["What should I do next?", ...(need ? [`Why isn't ${need.title.toLowerCase()} getting more help?`] : []), "Find food needs near me", "How does confirming work?"]
    : ["What is KitGap?", "Find needs near me", "How do I post a need?", "Can I try it without an account?"];

  return (
    <div className="kit-launcher no-print" data-open={open ? "" : undefined}>
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Kit, your KitGap helper"
          className="appear fixed inset-0 z-50 flex flex-col bg-surface pt-[env(safe-area-inset-top)] sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(680px,calc(100dvh-2.5rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line-strong sm:pt-0 sm:shadow-[0_24px_60px_rgb(28_41_33/0.28)]"
        >
          <header className="flex items-center gap-3 bg-forest px-4 py-3 text-white">
            <span aria-hidden className="relative grid size-10 shrink-0 place-items-center rounded-full bg-surface">
              <LogoMark className="kit-bob size-6" />
              {voice.state === "speaking" ? <span className="kit-listen absolute inset-0 rounded-full border-2 border-[#e0a43a]" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg leading-tight font-semibold">Kit</h2>
              <p className="truncate text-xs text-eyebrow">
                {voice.state === "listening" ? "Listening…" : voice.state === "transcribing" ? "Got it, one second…" : voice.state === "speaking" ? "Speaking…" : ai && snapshot?.signedIn ? "Your KitGap helper · AI-assisted" : "Your KitGap helper"}
              </p>
            </div>
            {canVoice && snapshot?.signedIn ? (
              <button
                type="button"
                onClick={() => {
                  if (voiceOn) voice.stopSpeaking();
                  setVoiceOn((v) => !v);
                }}
                aria-pressed={voiceOn}
                className="grid size-10 place-items-center rounded-full hover:bg-white/15"
              >
                {voiceOn ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
                <span className="sr-only">{voiceOn ? "Turn off Kit's voice" : "Turn on Kit's voice"}</span>
              </button>
            ) : null}
            <button type="button" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-white/15">
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close Kit</span>
            </button>
          </header>

          <div role="log" aria-live="polite" aria-label="Conversation with Kit" className="flex-1 space-y-3 overflow-y-auto bg-paper/60 px-3 py-4">
            <Bubble from="kit">
              <p>
                {hello}{" "}
                {nudges.length > 0
                  ? `Here's what needs you${nudges.length > 3 ? " most" : ""}:`
                  : snapshot?.signedIn
                    ? "You're all caught up. Ask me anything about KitGap."
                    : "I'm Kit. I can explain how KitGap works and help you find a need near you."}
              </p>
            </Bubble>
            {nudges.slice(0, 4).map((n) => (
              <div key={n.id} className="ml-10 rounded-xl border border-line bg-surface p-3">
                <p className="text-[0.95rem]">
                  {n.urgency === "now" ? <span className="mr-1.5 inline-block size-2 rounded-full bg-clay align-middle" aria-hidden /> : null}
                  {n.text}
                </p>
                <AppLink href={n.href} onClick={() => setOpen(false)} className="mt-1 inline-flex min-h-10 items-center gap-1 font-semibold">
                  {n.label} <ArrowRight aria-hidden className="size-4" />
                </AppLink>
              </div>
            ))}
            {messages.map((m) => (
              <Bubble key={m.id} from={m.from}>
                <p className="whitespace-pre-line">{m.text}</p>
                {m.actions && m.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <AppLink key={a.href} href={a.href} onClick={() => setOpen(false)} className={cn(buttonClass("secondary", "sm"), "no-underline")}>
                        {a.label} <ArrowRight aria-hidden className="size-4" />
                      </AppLink>
                    ))}
                  </div>
                ) : null}
              </Bubble>
            ))}
            {thinking ? (
              <Bubble from="kit">
                <span aria-label="Kit is writing">
                  <span className="kit-dot inline-block size-2 rounded-full bg-forest" /> <span className="kit-dot inline-block size-2 rounded-full bg-forest" />{" "}
                  <span className="kit-dot inline-block size-2 rounded-full bg-forest" />
                </span>
              </Bubble>
            ) : null}
            {messages.length === 0 && !thinking ? (
              <div className="ml-10 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="min-h-10 rounded-full border border-forest/40 bg-forest-tint px-3.5 text-left text-sm font-semibold text-forest-dark hover:bg-forest hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-line bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
            onSubmit={(e) => {
              e.preventDefault();
              const q = draft;
              setDraft("");
              void ask(q);
            }}
          >
            {canVoice && snapshot?.signedIn ? (
              <button
                type="button"
                onClick={() => void voice.listen()}
                disabled={thinking || voice.state === "transcribing"}
                aria-pressed={voice.state === "listening"}
                className={cn(
                  "relative grid size-11 shrink-0 place-items-center rounded-full border-2 disabled:opacity-50",
                  voice.state === "listening" ? "border-clay bg-clay text-white" : "border-forest text-forest hover:bg-forest-tint",
                )}
              >
                {voice.state === "listening" ? (
                  <>
                    <span aria-hidden className="kit-listen absolute inset-0 rounded-full bg-clay" style={{ transform: `scale(${1 + voice.level * 0.5})` }} />
                    <Square aria-hidden className="relative size-4 fill-current" />
                  </>
                ) : (
                  <Mic aria-hidden className="size-5" />
                )}
                <span className="sr-only">{voice.state === "listening" ? "Stop listening" : "Ask Kit by voice"}</span>
              </button>
            ) : null}
            <label htmlFor="kit-ask" className="sr-only">
              Ask Kit
            </label>
            <textarea
              id="kit-ask"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={voice.state === "listening" ? "Listening…" : "Ask Kit anything"}
              className="min-h-11 flex-1 resize-none rounded-full border border-line-strong bg-white px-4 py-2.5 text-base leading-snug focus:border-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-focus/30"
            />
            <button type="submit" disabled={thinking || !draft.trim()} className={cn(buttonClass("primary"), "size-11 shrink-0 rounded-full p-0")}>
              <ArrowUp aria-hidden className="size-5" />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {teaser ? (
            <button
              type="button"
              onClick={openPanel}
              className="appear max-w-[16rem] rounded-2xl rounded-br-sm border border-line-strong bg-surface px-3.5 py-2.5 text-left text-sm shadow-card"
            >
              <span className="font-semibold text-forest">Kit: </span>
              {teaser}
            </button>
          ) : null}
          <button
            ref={launcherRef}
            type="button"
            onClick={openPanel}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="relative grid size-14 place-items-center rounded-full border-2 border-surface bg-forest shadow-[0_10px_28px_rgb(28_41_33/0.35)] hover:bg-forest-dark"
          >
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-surface">
              <LogoMark className="kit-bob size-7" />
            </span>
            {badge > 0 ? (
              <span className="tabular absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full border-2 border-surface bg-clay px-1 text-xs font-bold text-white">{badge}</span>
            ) : null}
            <span className="sr-only">{badge > 0 ? `Ask Kit. ${badge} new for you.` : "Ask Kit, your KitGap helper"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({ from, children }: { from: "me" | "kit"; children: React.ReactNode }) {
  if (from === "me") {
    return (
      <div className="appear flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-forest px-3.5 py-2.5 text-white">{children}</div>
      </div>
    );
  }
  return (
    <div className="appear flex items-start gap-2">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface">
        <LogoMark className="size-5" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-surface px-3.5 py-2.5">
        <span className="sr-only">Kit: </span>
        {children}
      </div>
    </div>
  );
}
