"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Copy, Download, Layers, Loader2, RotateCcw, ScanSearch, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { updateExternalSignupAction } from "@/actions/discover";
import { COUNT_PRESETS, REFERENCE_VOCABULARY, countDetections, presetFor, queriesFor, singular, type CountResult, type Detection } from "@/lib/vision/count";
import { identify } from "@/lib/vision/grounding";
import { COUNT_SETTINGS, MODEL_DOWNLOAD_MB } from "@/lib/vision/protocol";
import { preparePhoto, useDetector } from "@/lib/vision/use-detector";
import { ActionForm } from "../ui/action-form";
import { SubmitButton } from "../ui/button";
import { cn } from "../ui/cn";
import { CountView } from "./count-view";
import { PhotoPicker } from "./photo-picker";
import { SpreadGuide } from "./spread-guide";

type Mode = "pile" | "one" | "kit";
type Photo = Awaited<ReturnType<typeof preparePhoto>>;

const MODES: { id: Mode; title: string; text: string; icon: React.ReactNode }[] = [
  { id: "pile", title: "Count a pile", text: "Pick what it is, snap the pile.", icon: <Layers /> },
  { id: "one", title: "Show me one first", text: "Snap one item, then snap them all.", icon: <ScanSearch /> },
  { id: "kit", title: "Check a kit", text: "Make sure every kit has everything.", icon: <ClipboardCheck /> },
];

const KIT_TEMPLATES: { id: string; label: string; items: { name: string; need: number }[] }[] = [
  { id: "school", label: "School kit", items: [{ name: "backpack", need: 1 }, { name: "notebook", need: 2 }, { name: "pencil", need: 2 }] },
  { id: "hygiene", label: "Hygiene kit", items: [{ name: "toothbrush", need: 1 }, { name: "toothpaste", need: 1 }, { name: "soap", need: 1 }, { name: "bottle", need: 1 }] },
  { id: "snack", label: "Snack bag", items: [{ name: "bag", need: 1 }, { name: "bottle", need: 1 }, { name: "can", need: 2 }] },
];

function plural(noun: string, n: number): string {
  const s = singular(noun);
  if (n === 1) return s;
  const of = s.match(/^(\S+)( of .+)$/);
  if (of) return `${plural(of[1], 2)}${of[2]}`;
  if (/(s|x|ch|sh)$/.test(s)) return `${s}es`;
  if (/[^aeiou]y$/.test(s)) return `${s.slice(0, -1)}ies`;
  return `${s}s`;
}

export function PhotoCounter({ signupId, initialMode = "pile", initialKit }: { signupId?: string; initialMode?: Mode; initialKit?: { name: string; need: number }[] }) {
  const detector = useDetector();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [consented, setConsented] = useState(false);

  // If the model is already saved on this device, get it ready right away.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cache = await caches.open("transformers-cache");
        const keys = await cache.keys();
        if (!cancelled && keys.some((k) => k.url.includes("grounding-dino"))) {
          setConsented(true);
          detector.warmUp();
        }
      } catch {
        // No Cache Storage (private mode): ask first, as for a first visit.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    setConsented(true);
    detector.warmUp();
  };

  return (
    <div className="space-y-8">
      <div role="radiogroup" aria-label="What do you want to do?" className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m.id)}
              className={cn(
                "press lift flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                on ? "border-forest bg-forest-tint" : "border-line bg-surface hover:border-forest/40",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5", on ? "bg-forest text-white" : "bg-sunken text-forest")}
              >
                {m.icon}
              </span>
              <span>
                <span className="block text-lg font-semibold">{m.title}</span>
                <span className="block text-muted">{m.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!consented ? (
        <ReadyCard onStart={start} />
      ) : (
        <>
          <ModelStatus detector={detector} />
          {mode === "pile" ? <PileMode key="pile" detector={detector} signupId={signupId} /> : null}
          {mode === "one" ? <OneFirstMode key="one" detector={detector} signupId={signupId} /> : null}
          {mode === "kit" ? <KitMode key="kit" detector={detector} initialKit={initialKit} /> : null}
        </>
      )}
    </div>
  );
}

type Detector = ReturnType<typeof useDetector>;

function ReadyCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-line/80 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-forest text-white">
          <ShieldCheck className="size-7" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-2xl font-semibold">Your photos stay on your device</h2>
          <p className="mt-1 text-muted">
            The counter runs right here in your browser. Nothing is uploaded. The first time, it downloads about {MODEL_DOWNLOAD_MB} MB, so use
            Wi-Fi if you can. After that it&apos;s saved and starts fast.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="press inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-lg font-semibold text-white hover:bg-forest-dark"
        >
          <Download className="size-5" aria-hidden="true" />
          Get the counter ready
        </button>
      </div>
    </div>
  );
}

function ModelStatus({ detector }: { detector: Detector }) {
  const { status, progress, error } = detector;
  if (status === "ready") return null;
  if (status === "error") {
    return (
      <p role="alert" className="rounded-xl bg-[#fdecea] px-5 py-4 text-[#8f1f14]">
        {error ?? "The counter couldn't start."} Try again in Chrome, Edge or Safari, or on Wi-Fi.
      </p>
    );
  }
  const pct = progress && progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  return (
    <div className="rounded-xl bg-sunken px-5 py-4" role="status">
      <p className="flex items-center gap-2 font-semibold">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {progress && pct < 100 ? `Getting the counter ready: ${pct}%` : "Getting the counter ready…"}
        {progress && pct < 100 ? (
          <span className="font-normal text-muted">
            ({Math.round(progress.loaded / 1e6)} of {Math.round(progress.total / 1e6)} MB)
          </span>
        ) : null}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <div className="h-full origin-left rounded-full bg-forest transition-transform duration-300" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className="mt-2 text-sm text-muted">You can choose your photo now. We&apos;ll count it as soon as this finishes.</p>
    </div>
  );
}

function Working({ url, label, seconds }: { url?: string; label: string; seconds?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local photo from this device
        <img src={url} alt="" className="block h-auto max-h-[60vh] w-full object-contain opacity-80" />
      ) : (
        <div className="h-64" />
      )}
      <div aria-hidden="true" className="scan absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-[#ffd166]/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 bg-ink/85 px-4 py-3 text-white">
        <p className="flex items-center justify-center gap-2 font-semibold" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          {label}
          {seconds ? <span className="font-normal text-white/80">About {seconds} seconds</span> : null}
        </p>
        {seconds ? (
          <div className="mx-auto mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            <div key={label} className="fill h-full rounded-full bg-[#ffd166]" style={{ animationDuration: `${seconds}s` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ItemPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const preset = presetFor(value);
  const custom = !preset && value ? value : "";
  return (
    <div className="space-y-3">
      <p id="what-label" className="text-lg font-semibold">
        What are you counting?
      </p>
      <ul aria-labelledby="what-label" className="flex flex-wrap gap-2">
        {COUNT_PRESETS.map((p) => {
          const on = preset?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(p.id)}
                className={cn(
                  "press min-h-11 rounded-full border px-4 font-semibold transition-colors",
                  on ? "border-forest bg-forest text-white" : "border-line-strong bg-white hover:border-forest hover:bg-forest-tint",
                )}
              >
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex max-w-md items-center gap-2">
        <label htmlFor="count-other" className="shrink-0 text-muted">
          Something else:
        </label>
        <input
          id="count-other"
          value={custom}
          onChange={(e) => onChange(e.target.value.slice(0, 40))}
          placeholder="like socks or cereal boxes"
          className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3"
        />
      </div>
    </div>
  );
}

function labelFor(value: string) {
  const preset = presetFor(value);
  return preset ? preset.label.toLowerCase() : value.trim() || "items";
}

function useCount(detector: Detector) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<(CountResult & { width: number; height: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const run = async (file: Blob, what: string) => {
    setFailed(null);
    setResult(null);
    setBusy(true);
    try {
      const p = await preparePhoto(file);
      setPhoto(p);
      const r = await detector.detect(p.blob, queriesFor(what), "count");
      setResult({ ...countDetections(r.dets, r.width, r.height, COUNT_SETTINGS), width: r.width, height: r.height });
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setPhoto(null);
    setResult(null);
    setFailed(null);
  };
  const seconds = (what: string) => detector.estimate(queriesFor(what).length);
  return { photo, result, busy, failed, run, reset, seconds };
}

function PileMode({ detector, signupId }: { detector: Detector; signupId?: string }) {
  const [what, setWhat] = useState("bags");
  const c = useCount(detector);
  return (
    <div className="space-y-6">
      {!c.photo && !c.busy ? (
        <>
          <ItemPicker value={what} onChange={setWhat} />
          <PhotoPicker
            label={`Snap all the ${labelFor(what)}`}
            hint="Lay them out in one layer with a little space between, then take the photo from above."
            onPhoto={(f) => c.run(f, what)}
          />
        </>
      ) : null}
      <CountOutcome c={c} what={what} signupId={signupId} />
    </div>
  );
}

function CountOutcome({ c, what, signupId }: { c: ReturnType<typeof useCount>; what: string; signupId?: string }) {
  const [count, setCount] = useState<number | null>(null);
  const preset = presetFor(what);
  if (c.busy) return <Working url={c.photo?.url} label={`Counting ${labelFor(what)}…`} seconds={c.seconds(what)} />;
  if (c.failed) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-xl bg-[#fdecea] px-5 py-4 text-[#8f1f14]">
          We couldn&apos;t count that photo. {c.failed}
        </p>
        <button type="button" onClick={c.reset} className="press inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-4 font-semibold">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try another photo
        </button>
      </div>
    );
  }
  if (!c.result || !c.photo) return null;
  const shown = count ?? c.result.count;
  const unsure = c.result.crowded || c.result.confidence !== "high";
  return (
    <div className="appear space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">We counted</p>
          <p className="font-serif text-6xl leading-none font-semibold tabular-nums" aria-live="polite">
            {shown} <span className="text-3xl">{plural(labelFor(what), shown)}</span>
          </p>
          <p className={cn("mt-2 font-semibold", unsure ? "text-clay" : "text-forest")}>
            {c.result.count === 0
              ? "We didn't find any. Try a closer photo, or pick a different item."
              : unsure
                ? "Check the boxes. Some may be doubled or missed."
                : "Looks clear. Check the boxes, then you're done."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(String(shown))}
            className="press inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-white px-4 font-semibold hover:bg-sunken"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy {shown}
          </button>
          <button
            type="button"
            onClick={() => {
              setCount(null);
              c.reset();
            }}
            className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white hover:bg-forest-dark"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Count another photo
          </button>
        </div>
      </div>
      <CountView url={c.photo.url} width={c.result.width} height={c.result.height} kept={c.result.kept} noun={plural(labelFor(what), 2)} onChange={setCount} />
      {unsure || c.result.count === 0 ? <SpreadGuide tip={preset?.tip} /> : preset?.tip ? <p className="text-muted">Tip: {preset.tip}</p> : null}
      {signupId ? (
        <ActionForm action={updateExternalSignupAction} hidden={{ id: signupId, status: "donated", itemsGiven: String(shown) }} success="Saved to My drives." className="rounded-2xl bg-forest-tint p-5">
          {() => (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-forest-dark">
                Save {shown} {plural(labelFor(what), shown)} as what you gave?
              </p>
              <SubmitButton>
                <Check className="size-4" aria-hidden="true" />
                Save
              </SubmitButton>
            </div>
          )}
        </ActionForm>
      ) : null}
    </div>
  );
}

function OneFirstMode({ detector, signupId }: { detector: Detector; signupId?: string }) {
  const [ref, setRef] = useState<Photo | null>(null);
  const [guesses, setGuesses] = useState<{ phrase: string; score: number }[] | null>(null);
  const [refBox, setRefBox] = useState<Detection | null>(null);
  const [busy, setBusy] = useState(false);
  const [what, setWhat] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const c = useCount(detector);

  const snapOne = async (file: Blob) => {
    setBusy(true);
    setGuesses(null);
    try {
      const p = await preparePhoto(file, 960);
      setRef(p);
      const r = await detector.detect(p.blob, REFERENCE_VOCABULARY, "name");
      const g = identify(r.dets, r.width, r.height);
      setGuesses(g);
      setRefBox(r.dets.find((d) => d.label === g[0]?.phrase) ?? null);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRef(null);
    setGuesses(null);
    setWhat(null);
    setTyped("");
    c.reset();
  };

  if (busy) return <Working url={ref?.url} label="Looking at your item…" seconds={detector.estimate(1)} />;

  if (!ref || !guesses) {
    return <PhotoPicker label="Step 1: snap just one" hint="Put one item on a plain table or floor and take a close photo." onPhoto={snapOne} />;
  }

  if (!what) {
    const sure = guesses[0] && guesses[0].score >= 0.3;
    return (
      <div className="appear grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="relative overflow-hidden rounded-2xl bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local photo from this device */}
          <img src={ref.url} alt="The one item you snapped" className="block h-auto w-full" />
          {refBox ? (
            <svg viewBox={`0 0 ${ref.width} ${ref.height}`} className="absolute inset-0 size-full" aria-hidden="true">
              <rect
                x={refBox.box.xmin}
                y={refBox.box.ymin}
                width={refBox.box.xmax - refBox.box.xmin}
                height={refBox.box.ymax - refBox.box.ymin}
                rx="8"
                fill="none"
                stroke="#ffd166"
                strokeWidth={Math.max(ref.width, ref.height) * 0.006}
              />
            </svg>
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="text-muted">Step 2: is this right?</p>
          <h3 className="font-serif text-3xl font-semibold">
            {sure ? `Looks like a ${guesses[0].phrase}.` : "We're not sure what this is."}
          </h3>
          <div className="flex flex-wrap gap-2">
            {guesses.map((g, i) => (
              <button
                key={g.phrase}
                type="button"
                onClick={() => setWhat(g.phrase)}
                className={cn(
                  "press inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold",
                  i === 0 && sure ? "border-forest bg-forest text-white hover:bg-forest-dark" : "border-line-strong bg-white hover:bg-forest-tint",
                )}
              >
                {i === 0 && sure ? <Check className="size-4" aria-hidden="true" /> : null}
                {i === 0 && sure ? `Yes, ${plural(g.phrase, 2)}` : `It's a ${g.phrase}`}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) setWhat(typed.trim());
            }}
            className="flex max-w-md gap-2"
          >
            <label htmlFor="one-typed" className="sr-only">
              Type what it is
            </label>
            <input
              id="one-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value.slice(0, 40))}
              placeholder="Or type what it is"
              className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3"
            />
            <button type="submit" className="press min-h-11 rounded-lg border border-line-strong bg-white px-4 font-semibold hover:bg-sunken">
              Use this
            </button>
          </form>
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 font-semibold text-forest underline">
            <RotateCcw className="size-4" aria-hidden="true" />
            Snap it again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!c.photo && !c.busy ? (
        <>
          <p className="inline-flex items-center gap-2 rounded-full bg-forest-tint px-4 py-2 font-semibold text-forest">
            <Sparkles className="size-4" aria-hidden="true" />
            Counting: {plural(what, 2)}
            <button type="button" onClick={() => setWhat(null)} className="ml-1 grid size-6 place-items-center rounded-full hover:bg-white" aria-label="Change item">
              <X className="size-4" aria-hidden="true" />
            </button>
          </p>
          <PhotoPicker label={`Step 3: snap all the ${plural(what, 2)}`} hint="One layer, a little space between, all in the photo." onPhoto={(f) => c.run(f, what)} />
        </>
      ) : null}
      <CountOutcome c={c} what={what} signupId={signupId} />
    </div>
  );
}

interface KitRow {
  name: string;
  need: number;
}

function KitMode({ detector, initialKit }: { detector: Detector; initialKit?: KitRow[] }) {
  const [rows, setRows] = useState<KitRow[]>(initialKit?.length ? initialKit : KIT_TEMPLATES[0].items);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [step, setStep] = useState<{ label: string; seconds: number } | null>(null);
  const [found, setFound] = useState<{ row: KitRow; count: number; kept: Detection[] }[] | null>(null);
  const [fixes, setFixes] = useState<Record<number, number>>({});
  const [size, setSize] = useState({ width: 1, height: 1 });

  const [failed, setFailed] = useState<string | null>(null);

  const check = async (file: Blob) => {
    setFound(null);
    setFixes({});
    setFailed(null);
    try {
      const p = await preparePhoto(file);
      setPhoto(p);
      const out: { row: KitRow; count: number; kept: Detection[] }[] = [];
      for (const [i, row] of rows.entries()) {
        setStep({ label: `Checking ${plural(row.name, 2)} (${i + 1} of ${rows.length})…`, seconds: detector.estimate(queriesFor(row.name).length) });
        const r = await detector.detect(p.blob, queriesFor(row.name), "count");
        setSize({ width: r.width, height: r.height });
        const res = countDetections(r.dets, r.width, r.height, COUNT_SETTINGS);
        out.push({ row, count: res.count, kept: res.kept });
      }
      setFound(out);
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setStep(null);
    }
  };

  const colors = ["#ffd166", "#5eead4", "#f9a8d4", "#a5b4fc", "#fdba74", "#86efac"];
  const allGood = useMemo(() => found?.every((f, i) => (fixes[i] ?? f.count) >= f.row.need) ?? false, [found, fixes]);

  if (step) return <Working url={photo?.url} label={step.label} seconds={step.seconds} />;

  if (found && photo) {
    return (
      <div className="appear grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex justify-center self-start overflow-hidden rounded-2xl bg-ink">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local photo from this device */}
            <img src={photo.url} alt="Your kit photo, with each item marked" className="block max-h-[70vh] w-auto max-w-full" />
            <svg viewBox={`0 0 ${size.width} ${size.height}`} className="absolute inset-0 size-full" aria-hidden="true">
              {found.flatMap((f, i) =>
                f.kept.map((d, j) => (
                  <rect
                    key={`${i}-${j}`}
                    className="pop"
                    x={d.box.xmin}
                    y={d.box.ymin}
                    width={d.box.xmax - d.box.xmin}
                    height={d.box.ymax - d.box.ymin}
                    rx="6"
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth={Math.max(size.width, size.height) * 0.005}
                  />
                )),
              )}
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className={cn("font-serif text-3xl font-semibold", allGood ? "text-forest" : "text-clay")}>
            {allGood ? "This kit has everything." : "Something may be missing."}
          </h3>
          <ul className="space-y-2">
            {found.map((f, i) => {
              const have = fixes[i] ?? f.count;
              const ok = have >= f.row.need;
              return (
                <li key={f.row.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-white", ok ? "bg-forest" : "bg-clay")}>
                    {ok ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                  </span>
                  <span className="flex-1">
                    <span className="font-semibold">{plural(f.row.name, 2)}</span>
                    <span className="block text-sm text-muted">
                      {have} of {f.row.need} {ok ? "" : "· missing " + (f.row.need - have)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1" role="group" aria-label={`Fix ${plural(f.row.name, 2)}`}>
                    <button type="button" onClick={() => setFixes({ ...fixes, [i]: Math.max(0, have - 1) })} className="press grid size-9 place-items-center rounded-lg border border-line-strong" aria-label="One less">
                      −
                    </button>
                    <button type="button" onClick={() => setFixes({ ...fixes, [i]: have + 1 })} className="press grid size-9 place-items-center rounded-lg border border-line-strong" aria-label="One more">
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">Small things like pencils are easy to miss. Fix any number with − and +.</p>
          <button
            type="button"
            onClick={() => {
              setFound(null);
              setPhoto(null);
            }}
            className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 font-semibold text-white hover:bg-forest-dark"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Check the next kit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-lg font-semibold">What goes in one kit?</p>
        <div className="flex flex-wrap gap-2">
          {KIT_TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setRows(t.items)} className="press min-h-10 rounded-full border border-line-strong bg-white px-4 font-semibold hover:bg-forest-tint">
              {t.label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`kit-need-${i}`}>
                How many
              </label>
              <input
                id={`kit-need-${i}`}
                inputMode="numeric"
                value={row.need}
                onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, need: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) } : r)))}
                className="min-h-11 w-16 rounded-lg border border-line-strong bg-white px-3 text-center"
              />
              <label className="sr-only" htmlFor={`kit-name-${i}`}>
                Item
              </label>
              <input
                id={`kit-name-${i}`}
                value={row.name}
                onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value.slice(0, 40) } : r)))}
                className="min-h-11 w-full max-w-xs rounded-lg border border-line-strong bg-white px-3"
              />
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1} className="press grid size-11 place-items-center rounded-lg hover:bg-sunken disabled:opacity-40" aria-label={`Remove ${row.name}`}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {rows.length < 6 ? (
          <button type="button" onClick={() => setRows([...rows, { name: "", need: 1 }])} className="min-h-11 font-semibold text-forest underline">
            Add an item
          </button>
        ) : null}
      </div>
      {failed ? (
        <p role="alert" className="rounded-xl bg-[#fdecea] px-5 py-4 text-[#8f1f14]">
          We couldn&apos;t check that photo. {failed}
        </p>
      ) : null}
      <PhotoPicker
        label="Lay out one kit and snap it"
        hint="Take everything out of the bag and spread it on a table, with the bag next to it."
        onPhoto={(f) => {
          if (rows.every((r) => r.name.trim())) void check(f);
        }}
      />
    </div>
  );
}
