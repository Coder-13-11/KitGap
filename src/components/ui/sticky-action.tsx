"use client";

// A bottom action bar for small screens. It hides while the section it points
// to is on screen, and while someone is typing, so it never covers the form,
// its errors, or the keyboard.

import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "./button-class";

export function StickyAction({
  targetId,
  href,
  hideWhenId,
  children,
}: {
  targetId: string;
  href: string;
  hideWhenId?: string;
  children: ReactNode;
}) {
  const [targetVisible, setTargetVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const nodes = [targetId, hideWhenId]
      .filter((id): id is string => Boolean(id))
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setTargetVisible(visible.size > 0);
      },
      { threshold: 0.15 },
    );
    for (const node of nodes) observer.observe(node);
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      setTyping(el.matches("input, textarea, select"));
    };
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", onFocus);
    };
  }, [targetId, hideWhenId]);

  if (targetVisible || typing) return null;
  return (
    <div data-sticky-action className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] max-md:pb-3 standalone:max-lg:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] standalone:max-lg:pb-3 lg:hidden no-print">
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
        className={buttonClass("primary", "md", true)}
      >
        {children}
      </a>
    </div>
  );
}
