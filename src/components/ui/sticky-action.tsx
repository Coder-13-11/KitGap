"use client";

// A bottom action bar for small screens. It hides while the section it points
// to is on screen, and while someone is typing, so it never covers the form,
// its errors, or the keyboard.

import { useEffect, useState, type ReactNode } from "react";

export function StickyAction({ targetId, href, children }: { targetId: string; href: string; children: ReactNode }) {
  const [targetVisible, setTargetVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(target);
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      setTyping(el.matches("input, textarea, select"));
    };
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", onFocus);
    };
  }, [targetId]);

  if (targetVisible || typing) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden no-print">
      <a
        href={href}
        onClick={(event) => {
          const target = document.getElementById(targetId);
          if (target) {
            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            target.querySelector<HTMLElement>("input, button, a")?.focus({ preventScroll: true });
          }
        }}
        className="flex min-h-11 w-full items-center justify-center rounded-md bg-forest px-4 text-center font-semibold text-white no-underline"
      >
        {children}
      </a>
    </div>
  );
}
