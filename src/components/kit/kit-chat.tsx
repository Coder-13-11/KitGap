"use client";

// Kit's chat screen. Kit speaks first with today's numbers, then answers
// taps and typed questions with advice and drafts that are one tap from
// being posted or sent. Answers come from the server (askKitAction), which
// checks every number against the need's real facts.

import { ArrowUp, BarChart3, Check, Copy, Download, Camera, HelpCircle, Mail, Pencil, Sparkles, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { askKitAction } from "@/actions/kit";
import {
  briefing,
  diagnose,
  emailDrafts,
  greeting,
  partnerIdeas,
  type Draft,
  type EmailDraft,
  type KitInput,
  type KitIntent,
} from "@/domain/kit-helper";
import { countNoun, formatCount } from "@/domain/text";
import { LogoMark } from "../site/logo";
import { AppLink } from "../ui/base";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";

type Card =
  | { kind: "tips" }
  | { kind: "instagram"; drafts: Draft[] }
  | { kind: "email"; drafts: EmailDraft[] }
  | { kind: "partners" }
  | { kind: "stats" };

interface Message {
  id: number;
  from: "me" | "kit";
  text: string;
  card?: Card;
  next?: KitIntent[];
  ai?: boolean;
}

const CHIPS: { intent: KitIntent; label: string; icon: ReactNode }[] = [
  { intent: "why", label: "Why isn't it getting more help?", icon: <HelpCircle aria-hidden className="size-4" /> },
  { intent: "instagram", label: "Write an Instagram post", icon: <Camera aria-hidden className="size-4" /> },
  { intent: "partners", label: "Who could I team up with?", icon: <Users aria-hidden className="size-4" /> },
  { intent: "email", label: "Draft an email", icon: <Mail aria-hidden className="size-4" /> },
  { intent: "stats", label: "How far has it reached?", icon: <BarChart3 aria-hidden className="size-4" /> },
];
const CHIP_LABEL = Object.fromEntries(CHIPS.map((c) => [c.intent, c.label])) as Record<KitIntent, string>;

export function KitChat({
  requestId,
  input,
  nearbyOrgs,
  imagePath,
  manageHref,
  ai,
  initialAsk = null,
}: {
  requestId: string;
  input: KitInput;
  nearbyOrgs: string[];
  imagePath: string;
  manageHref: string | null;
  ai: boolean;
  // Opened from a link such as "Write a post": ask that straight away.
  initialAsk?: KitIntent | null;
}) {
  const nextId = useRef(1);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: "kit", text: `${greeting(new Date().getHours(), input.askerName)} ${briefing(input)}`, card: { kind: "stats" }, next: ["why", "instagram", "partners"] },
  ]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 1 || thinking) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, thinking]);

  const push = (m: Omit<Message, "id">) => setMessages((list) => [...list, { ...m, id: nextId.current++ }]);

  const ask = async (question: string, intent: KitIntent | null) => {
    if (thinking || !question.trim()) return;
    const history = messages.slice(-6).map((m) => ({ from: m.from, text: m.text }));
    push({ from: "me", text: question });
    setThinking(true);
    let reply: Awaited<ReturnType<typeof askKitAction>>;
    try {
      // At least a short pause, so a fast answer doesn't feel like it skipped reading.
      [reply] = await Promise.all([askKitAction({ requestId, question, intent, history }), new Promise((r) => setTimeout(r, 600))]);
    } catch {
      reply = { error: "Kit couldn't connect. Check your internet and try again." };
    }
    setThinking(false);
    if ("error" in reply) {
      push({ from: "kit", text: reply.error });
      return;
    }
    const card: Card | undefined =
      reply.intent === "why"
        ? { kind: "tips" }
        : reply.intent === "instagram" && reply.instagram
          ? { kind: "instagram", drafts: reply.instagram }
          : reply.intent === "email" && reply.emails
            ? { kind: "email", drafts: reply.emails }
            : reply.intent === "partners"
              ? { kind: "partners" }
              : reply.intent === "stats"
                ? { kind: "stats" }
                : undefined;
    push({ from: "kit", text: reply.text, card, next: reply.next, ai: reply.source === "ai" });
  };

  // Partner emails are written instantly from the rules: the person picked who.
  const emailFor = (emailId: string, who: string) => {
    const found = emailDrafts(input, nearbyOrgs).find((e) => e.id === emailId);
    push({ from: "me", text: `Write an email to ${who.toLowerCase()}` });
    if (found) push({ from: "kit", text: "Here you go. Change anything you like before sending.", card: { kind: "email", drafts: [found] }, next: ["instagram", "partners"] });
  };

  const asked = useRef(false);
  useEffect(() => {
    if (!initialAsk || asked.current) return;
    asked.current = true;
    void ask(CHIP_LABEL[initialAsk], initialAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, [initialAsk]);

  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft("");
    void ask(q, null);
  };

  return (
    <div className="tag-shape flex min-h-[70dvh] flex-col overflow-hidden border border-line-strong bg-surface shadow-card">
      <header className="flex items-center gap-3 border-b border-line bg-forest px-4 py-3 text-white sm:px-5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">
          <LogoMark className="kit-bob size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl leading-tight font-semibold">Kit</h1>
          <p className="truncate text-sm text-eyebrow">Your helper for {input.title.toLowerCase()}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold sm:inline-flex">
          <Sparkles aria-hidden className="size-3.5" /> {ai ? "AI-assisted" : "Written rules"}
        </span>
      </header>

      <div role="log" aria-live="polite" aria-label="Conversation with Kit" className="flex-1 space-y-4 overflow-y-auto bg-paper/60 px-3 py-4 sm:px-5">
        {messages.map((m, i) => (
          <MessageRow key={m.id} message={m}>
            {m.card ? (
              <CardView
                card={m.card}
                input={input}
                nearbyOrgs={nearbyOrgs}
                imagePath={imagePath}
                manageHref={manageHref}
                onIntent={(intent) => void ask(CHIP_LABEL[intent], intent)}
                onEmail={emailFor}
              />
            ) : null}
            {m.from === "kit" && m.next && m.next.length > 0 && i === messages.length - 1 && !thinking ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.next.map((intent) => (
                  <Chip key={intent} onClick={() => void ask(CHIP_LABEL[intent], intent)}>
                    {CHIPS.find((c) => c.intent === intent)?.icon} {CHIP_LABEL[intent]}
                  </Chip>
                ))}
              </div>
            ) : null}
          </MessageRow>
        ))}
        {thinking ? (
          <div className="flex items-end gap-2">
            <KitAvatar />
            <p className="rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3" aria-label="Kit is writing">
              <span className="kit-dot inline-block size-2 rounded-full bg-forest" />{" "}
              <span className="kit-dot inline-block size-2 rounded-full bg-forest" />{" "}
              <span className="kit-dot inline-block size-2 rounded-full bg-forest" />
            </p>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t border-line bg-surface px-3 py-3 sm:px-5">
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {CHIPS.map((c) => (
            <Chip key={c.intent} onClick={() => void ask(c.label, c.intent)} disabled={thinking}>
              {c.icon} {c.label}
            </Chip>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="kit-question" className="sr-only">
            Ask Kit a question
          </label>
          <textarea
            id="kit-question"
            rows={1}
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Kit anything, like “why isn't anyone helping?”"
            className="min-h-11 flex-1 resize-none rounded-lg border border-line-strong bg-white px-3 py-2.5 text-base leading-snug focus:border-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-focus/30"
          />
          <button type="submit" disabled={thinking || !draft.trim()} className={cn(buttonClass("primary"), "size-11 shrink-0 p-0")}>
            <ArrowUp aria-hidden className="size-5" />
            <span className="sr-only">Send</span>
          </button>
        </form>
        <p className="text-xs text-muted">
          {ai
            ? "Kit uses AI to write from this need's real numbers, and checks every number before showing it. Read drafts before you post or send them."
            : "Kit uses this need's real numbers and written tips. Read drafts before you post or send them."}
        </p>
      </div>
    </div>
  );
}

function KitAvatar() {
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface">
      <LogoMark className="size-5" />
    </span>
  );
}

function MessageRow({ message, children }: { message: Message; children?: ReactNode }) {
  if (message.from === "me") {
    return (
      <div className="appear flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-forest px-4 py-2.5 text-white">{message.text}</p>
      </div>
    );
  }
  return (
    <div className="appear flex items-start gap-2">
      <KitAvatar />
      <div className="min-w-0 flex-1">
        <p className="max-w-[95%] rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 whitespace-pre-line">
          <span className="sr-only">Kit: </span>
          {message.text}
        </p>
        {children}
      </div>
    </div>
  );
}

function Chip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-forest/40 bg-forest-tint px-3.5 text-sm font-semibold text-forest-dark hover:bg-forest hover:text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function CardView({
  card,
  input,
  nearbyOrgs,
  imagePath,
  manageHref,
  onIntent,
  onEmail,
}: {
  card: Card;
  input: KitInput;
  nearbyOrgs: string[];
  imagePath: string;
  manageHref: string | null;
  onIntent: (intent: KitIntent) => void;
  onEmail: (emailId: string, who: string) => void;
}) {
  const shell = "mt-2 space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-4";
  if (card.kind === "stats") return <StatsCard input={input} className={shell} />;
  if (card.kind === "tips") {
    return (
      <ol className={shell}>
        {diagnose(input).map((t, i) => (
          <li key={t.title} className={cn("space-y-1 rounded-lg p-3", t.tone === "fix" ? "bg-amber-tint" : "bg-forest-tint")}>
            <p className="font-semibold">
              <span className="tabular mr-1.5 text-muted">{i + 1}.</span>
              {t.title}
            </p>
            <p className="text-[0.95rem]">{t.detail}</p>
            {t.next ? (
              <button type="button" onClick={() => onIntent(t.next!)} className="min-h-10 text-sm font-semibold text-forest underline">
                {CHIP_LABEL[t.next]} →
              </button>
            ) : t.title === "Say who it helps" && manageHref ? (
              <AppLink href={manageHref} className="inline-flex min-h-10 items-center text-sm font-semibold">
                Edit the need →
              </AppLink>
            ) : null}
          </li>
        ))}
      </ol>
    );
  }
  if (card.kind === "partners") {
    return (
      <ul className={shell}>
        {partnerIdeas(input, nearbyOrgs).map((p) => (
          <li key={p.id} className="flex flex-col gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">{p.title}</p>
              <p className="text-[0.95rem] text-muted">{p.why}</p>
            </div>
            {p.emailId ? (
              <button type="button" onClick={() => onEmail(p.emailId!, p.title)} className={cn(buttonClass("secondary", "sm"), "shrink-0")}>
                <Mail aria-hidden className="size-4" /> Write the email
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  if (card.kind === "instagram") {
    return (
      <div className={shell}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the generated post image */}
        <img src={imagePath} alt="The post picture: what's needed, the progress bar and a QR code to the need" width={1080} height={1080} className="w-40 rounded-md border border-line sm:w-48" loading="lazy" />
        {card.drafts.map((d) => (
          <InstagramDraft key={d.id} draft={d} imagePath={imagePath} />
        ))}
      </div>
    );
  }
  return (
    <div className={shell}>
      {card.drafts.map((d) => (
        <EmailDraftView key={d.id} draft={d} />
      ))}
    </div>
  );
}

function StatsCard({ input, className }: { input: KitInput; className: string }) {
  const week = input.viewsLast7;
  const max = Math.max(1, ...week);
  const days = ["", "", "", "", "", "", ""].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  });
  const tiles = [
    { label: "People who opened it", value: input.views === null ? "–" : formatCount(input.views) },
    { label: input.activeDrives === 1 ? "Group helping" : "Groups helping", value: formatCount(input.activeDrives) },
    { label: "Confirmed received", value: `${formatCount(input.accepted)} of ${formatCount(input.target)}` },
    { label: input.passed ? "Date passed" : "Days left", value: input.passed ? "0" : formatCount(Math.max(input.daysLeft, 0)) },
  ];
  return (
    <div className={className}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-xs text-muted">{t.label}</dt>
            <dd className="tabular font-serif text-2xl font-semibold">{t.value}</dd>
          </div>
        ))}
      </dl>
      <figure>
        <figcaption className="text-xs text-muted">Page views, last 7 days ({formatCount(week.reduce((a, b) => a + b, 0))} in all)</figcaption>
        <div className="mt-2 flex h-16 items-end gap-1.5" aria-hidden>
          {week.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-sm bg-forest" style={{ height: `${Math.max(4, (v / max) * 48)}px`, opacity: v === 0 ? 0.25 : 1 }} />
              <span className="text-[0.65rem] text-muted">{days[i]}</span>
            </div>
          ))}
        </div>
        <p className="sr-only">Views by day, oldest first: {week.join(", ")}.</p>
      </figure>
      <p className="text-sm text-muted">{countNoun(input.available, input.unitName)} still need someone.</p>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function InstagramDraft({ draft, imagePath }: { draft: Draft; imagePath: string }) {
  const [text, setText] = useState(draft.text);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");

  const post = async () => {
    const copied = await copyText(text);
    try {
      const blob = await (await fetch(imagePath)).blob();
      const file = new File([blob], "kitgap-post.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        setNote(copied ? "Caption copied. Pick Instagram, then paste the caption." : "Pick Instagram, then add the caption.");
        await navigator.share({ files: [file], text });
        return;
      }
      // Computers: save the picture, keep the caption on the clipboard, open Instagram.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kitgap-post.png";
      a.click();
      URL.revokeObjectURL(a.href);
      window.open("https://www.instagram.com/", "_blank", "noopener");
      setNote(copied ? "Picture saved and caption copied. In Instagram, tap + (Create), pick the picture and paste the caption." : "Picture saved. In Instagram, tap + (Create) and pick it.");
    } catch {
      // Share sheet closed: nothing to do.
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold text-muted">{draft.label}</p>
      {editing ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} aria-label={`Edit the ${draft.label} caption`} className="w-full rounded-md border border-line-strong bg-white p-2 text-[0.95rem] leading-relaxed" />
      ) : (
        <p className="text-[0.95rem] whitespace-pre-line">{text}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={post} className={buttonClass("primary", "sm")}>
          <Camera aria-hidden className="size-4" /> Post to Instagram
        </button>
        <CopyButton text={text} label="Copy caption" />
        <button type="button" onClick={() => setEditing((e) => !e)} className={buttonClass("quiet", "sm")}>
          <Pencil aria-hidden className="size-4" /> {editing ? "Done" : "Edit"}
        </button>
        <a href={imagePath} download="kitgap-post.png" className={buttonClass("quiet", "sm")}>
          <Download aria-hidden className="size-4" /> Picture
        </a>
      </div>
      <p role="status" className="text-sm text-forest">
        {note}
      </p>
    </div>
  );
}

function EmailDraftView({ draft }: { draft: EmailDraft }) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold text-muted">{draft.label}</p>
      {editing ? (
        <>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className="w-full rounded-md border border-line-strong bg-white p-2 font-semibold" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} aria-label="Email" className="w-full rounded-md border border-line-strong bg-white p-2 text-[0.95rem] leading-relaxed" />
        </>
      ) : (
        <>
          <p className="font-semibold">{subject}</p>
          <p className="text-[0.95rem] whitespace-pre-line">{body}</p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={mailto} className={buttonClass("primary", "sm")}>
          <Mail aria-hidden className="size-4" /> Open in email
        </a>
        <CopyButton text={`${subject}\n\n${body}`} label="Copy" />
        <button type="button" onClick={() => setEditing((e) => !e)} className={buttonClass("quiet", "sm")}>
          <Pencil aria-hidden className="size-4" /> {editing ? "Done" : "Edit"}
        </button>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }
      }}
      className={buttonClass("secondary", "sm")}
    >
      {done ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} {done ? "Copied" : label}
    </button>
  );
}
