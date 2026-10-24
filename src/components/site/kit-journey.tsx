"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/components/ui/cn";

// One example kit, told in five steps. Three tallies show which number each
// step moves: a pledge moves "promised", a check-in moves "received", and
// only the organization's confirmation moves "confirmed".

const ORG = "Riverbend Family Center";

const STEPS = [
  { who: ORG, verb: "posts the list", text: "1 backpack, 2 notebooks and 1 pencil pack per kit. Bring nothing else.", moves: null },
  { who: "Sam, a club member", verb: "pledges", text: "“I'll bring 2 notebooks.” A promise. It isn't counted as collected.", moves: "promised" },
  { who: "Jordan, the coordinator", verb: "checks it in", text: "The notebooks arrive at school, checked and usable.", moves: "received" },
  { who: "Jordan", verb: "packs and hands over", text: "A complete kit goes to the side entrance. Still not counted as delivered.", moves: null },
  { who: ORG, verb: "confirms it arrived", text: "The hole on the tag fills. This is the only number that counts.", moves: "confirmed" },
] as const;

type Tally = "promised" | "received" | "confirmed";
const TALLIES: { key: Tally; label: string; at: number }[] = [
  { key: "promised", label: "Promised", at: 1 },
  { key: "received", label: "Received", at: 2 },
  { key: "confirmed", label: "Confirmed", at: 4 },
];

const STEP_MS = 1900;

const ITEMS = [
  { label: "1 backpack", src: "/photos/backpack.jpg" },
  { label: "2 notebooks", src: "/photos/notebooks.jpg" },
  { label: "1 pencil pack", src: "/photos/pencils.jpg" },
];

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function KitJourney() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  // Start once the tag is on screen; with reduced motion, show the end state.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || typeof IntersectionObserver === "undefined") {
      requestAnimationFrame(() => setStep(STEPS.length - 1));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (step >= STEPS.length - 1) {
      const id = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step]);

  const confirmed = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <section
      ref={ref}
      aria-labelledby="journey-title"
      className="tag-shape relative border border-line-strong bg-surface p-5 text-ink shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500",
              confirmed ? "border-forest bg-forest text-white" : "border-line-strong bg-paper",
            )}
          >
            {confirmed ? <Check className="kg-pop size-4" /> : null}
          </span>
          <div className="min-w-0">
            <h2 id="journey-title" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              One kit, from list to doorstep
            </h2>
            <p className="text-sm text-muted">An example drive. Nothing here is saved.</p>
          </div>
        </div>
        <span className="shrink-0 rounded-[2px_8px_8px_2px] border border-clay/30 bg-clay-tint px-2.5 py-1 text-sm font-semibold text-clay">
          Example
        </span>
      </div>

      <ul aria-label="What this kit needs" className="mt-5 grid grid-cols-3 gap-2">
        {ITEMS.map((item, i) => {
          const checkedIn = step >= 3 || (step >= 2 && i === 1);
          return (
            <li
              key={item.label}
              className={cn(
                "overflow-hidden rounded-[2px_8px_8px_2px] border text-center text-sm font-semibold transition-colors duration-500",
                checkedIn ? "border-forest/50 bg-forest-tint text-forest-dark" : "border-line bg-paper text-ink",
              )}
            >
              <span className="relative block aspect-square bg-sunken">
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 8rem, 30vw"
                  className="object-cover mix-blend-multiply [filter:sepia(0.2)_saturate(0.85)]"
                />
                {checkedIn ? (
                  <span className="kg-pop absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-forest text-white shadow">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="block px-1.5 py-2">{item.label}</span>
            </li>
          );
        })}
      </ul>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-md border border-line-strong bg-paper">
        {TALLIES.map((t) => {
          const on = step >= t.at;
          return (
            <div key={t.key} className="px-3 py-2.5 text-center">
              <dt className="text-sm font-semibold text-muted">{t.label}</dt>
              <dd
                key={on ? "1" : "0"}
                className={cn(
                  "tabular font-serif text-3xl leading-tight font-semibold",
                  on && "kg-pop",
                  t.key === "confirmed" && on ? "text-forest" : "text-ink",
                )}
              >
                {on ? 1 : 0}
              </dd>
            </div>
          );
        })}
      </dl>

      <ol aria-label="Steps" className="mt-5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s.verb} className="flex-1">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
              aria-label={`Step ${i + 1}: ${s.who} ${s.verb}`}
              aria-current={i === step ? "step" : undefined}
              className="group block w-full py-2.5"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors duration-500",
                  i < step ? "bg-forest-500" : i === step ? (confirmed ? "bg-forest" : "bg-forest-500") : "bg-sunken group-hover:bg-line",
                )}
              />
            </button>
          </li>
        ))}
      </ol>

      <p className="sr-only">
        A pledge moves the promised count, a coordinator&rsquo;s check-in moves the received count, and only the organization&rsquo;s
        confirmation moves the confirmed count.
      </p>
      {/* Quiet while it plays by itself, so screen readers aren't interrupted every two seconds. */}
      <div className="mt-2 min-h-[6.5rem]" aria-live={playing ? "off" : "polite"}>
        <p key={step} className="kg-slide">
          <span className="text-sm font-semibold text-muted">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="mt-1 block font-serif text-xl font-semibold tracking-tight">
            {current.who} {current.verb}
          </span>
          <span className="mt-1 block text-muted">{current.text}</span>
        </p>
      </div>

      <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        {confirmed ? (
          <p className="kg-stamp stamp text-sm">Confirmed by {ORG}</p>
        ) : (
          <p className="text-sm font-semibold">
            {step === 0 ? "Not started" : current.moves === "promised" ? "Promised, not collected" : "Not yet confirmed by the organization"}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setPlaying(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-forest hover:bg-forest-tint"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {confirmed ? "Play again" : "Start over"}
        </button>
      </div>
    </section>
  );
}
