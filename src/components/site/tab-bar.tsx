"use client";

// The bottom tab bar: how KitGap is navigated on a phone, in the browser and
// in the installed or native app. Tablets get it too when installed, since
// there's no browser bar there. From 768px up the header nav takes over.

import { Bell, CircleUserRound, FlaskConical, HandHeart, Home, LogIn, ScanLine, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/native";
import { AppLink, useBase } from "../ui/base";
import { cn } from "../ui/cn";

const ICONS = { home: Home, requests: Search, drives: HandHeart, updates: Bell, demo: FlaskConical, signin: LogIn, scan: ScanLine, profile: CircleUserRound };
const noop = () => () => {};

export interface Tab {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  count?: number;
}

export function TabBar({ tabs: given }: { tabs: Tab[] }) {
  const pathname = usePathname();
  // The native app adds a Scan tab for receipt and invitation QR codes.
  const native = useSyncExternalStore(noop, isNativeApp, () => false);
  const tabs: Tab[] = native ? [...given.slice(0, 2), { href: "/scan", label: "Scan", icon: "scan" }, ...given.slice(2)] : given;
  const base = useBase();
  const current = (href: string) => {
    const full = base + href;
    if (href === "/" || href === "/home") return pathname === full || pathname === base || pathname === `${base}/`;
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgb(28_41_33/0.06)] max-md:block standalone:max-lg:block in-data-[native=true]:max-lg:block no-print"
    >
      <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon];
          const on = current(tab.href);
          return (
            <li key={tab.href}>
              <AppLink
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold no-underline",
                  on ? "text-forest-dark" : "text-muted",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", on && "bg-forest-tint")}>
                  <Icon aria-hidden className="size-5" />
                </span>
                {tab.label}
                {tab.count ? (
                  <span className="tabular absolute top-1.5 left-[calc(50%+0.6rem)] min-w-5 rounded-full bg-clay px-1 text-center text-[0.7rem] leading-5 text-white">
                    {tab.count > 99 ? "99+" : tab.count}
                    <span className="sr-only"> new</span>
                  </span>
                ) : null}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
