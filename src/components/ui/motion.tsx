"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "./cn";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Slides content up into place when it scrolls into view. Content is always visible; only its position moves. */
export function Reveal({
  children,
  className,
  index = 0,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      requestAnimationFrame(() => setShown(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <As
      ref={ref as never}
      data-reveal={shown ? "shown" : "waiting"}
      style={{ "--i": index } as CSSProperties}
      className={className}
    >
      {children}
    </As>
  );
}

/**
 * Counts up to a number once it is on screen. Screen readers get the final
 * value only, so they never hear the intermediate numbers.
 */
export function CountUp({
  value,
  suffix = "",
  duration = 1100,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        run();
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      <span aria-hidden="true">
        {shown.toLocaleString("en-US")}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString("en-US")}
        {suffix}
      </span>
    </span>
  );
}

/** A circular progress ring. Decorative: always pair it with a visible text value. */
export function ProgressRing({
  value,
  max,
  size = 132,
  stroke = 12,
  tone = "forest",
  children,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  tone?: "forest" | "white";
  children?: ReactNode;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(fraction));
    return () => cancelAnimationFrame(id);
  }, [fraction]);

  const track = tone === "white" ? "rgb(255 255 255 / 0.25)" : "var(--color-forest-100)";
  const bar = tone === "white" ? "#ffffff" : "var(--color-forest)";

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bar}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn)}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center text-center">{children}</div> : null}
    </div>
  );
}
