"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppLink, useBase } from "../ui/base";
import { buttonClass } from "../ui/button-class";
import { cn } from "../ui/cn";
import { LogoMark } from "./logo";

export interface NavItem {
  href: string;
  label: string;
  count?: number;
}

function NavCount({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <>
      <span aria-hidden className="tabular ml-1.5 inline-flex min-w-6 justify-center rounded-full bg-clay px-1.5 text-sm font-semibold text-white">
        {count > 99 ? "99+" : count}
      </span>
      <span className="sr-only"> ({count} new)</span>
    </>
  );
}

export interface AccountLink {
  href: string;
  label: string;
}

export function SiteHeader({
  nav,
  user,
  accountLinks,
  signOutAction,
  isDemo,
}: {
  nav: NavItem[];
  user: { displayName: string } | null;
  accountLinks: AccountLink[];
  signOutAction: (() => Promise<void>) | null;
  isDemo: boolean;
}) {
  const pathname = usePathname();
  const base = useBase();
  // Menus remember the page they were opened on, so they close after navigating.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [accountOpenOn, setAccountOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const accountOpen = accountOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const setAccountOpen = (open: boolean) => setAccountOpenOn(open ? pathname : null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpenOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpenOn(null);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const current = (href: string) => {
    const full = base + href;
    return pathname === full || pathname.startsWith(full + "/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface shadow-[0_1px_0_rgb(28_41_33/0.08)] no-print">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <AppLink href="/" className="flex min-h-11 items-center gap-2 rounded-md text-ink no-underline">
          <LogoMark />
          <span className="font-serif text-xl font-semibold tracking-tight">KitGap</span>
        </AppLink>

        <nav aria-label="Main" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <AppLink
                  href={item.href}
                  aria-current={current(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md px-3 font-semibold no-underline",
                    current(item.href) ? "bg-forest-tint text-forest-dark" : "text-ink hover:bg-sunken",
                  )}
                >
                  {item.label}
                  <NavCount count={item.count} />
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-controls="account-menu"
                onClick={() => setAccountOpen(!accountOpen)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 font-semibold text-ink hover:bg-sunken"
              >
                <span className="max-w-[12rem] truncate">{user.displayName}</span>
                <ChevronDown aria-hidden className="size-4" />
              </button>
              <div
                id="account-menu"
                hidden={!accountOpen}
                className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-line-strong/40 bg-surface p-1.5 shadow-card"
              >
                <ul>
                  {accountLinks.map((link) => (
                    <li key={link.href + link.label}>
                      <AppLink href={link.href} className="block rounded-md px-3 py-2.5 text-ink no-underline hover:bg-sunken">
                        {link.label}
                      </AppLink>
                    </li>
                  ))}
                </ul>
                {signOutAction ? (
                  <form action={signOutAction} className="mt-1 border-t border-line pt-1">
                    <button type="submit" className="w-full rounded-md px-3 py-2.5 text-left text-ink hover:bg-sunken">
                      Sign out
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : isDemo ? null : (
            <>
              <AppLink href="/sign-in" className={buttonClass("quiet")}>
                Sign in
              </AppLink>
              <AppLink href="/demo" className={buttonClass("secondary")}>
                Try the demo
              </AppLink>
              <AppLink href="/sign-up" className={buttonClass("primary")}>
                Create account
              </AppLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold text-ink hover:bg-sunken md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          Menu
        </button>
      </div>

      <div id="mobile-menu" hidden={!menuOpen} className="border-t border-line px-4 pb-4 md:hidden">
        <nav aria-label="Main">
          <ul className="flex flex-col py-2">
            {nav.map((item) => (
              <li key={item.href}>
                <AppLink
                  href={item.href}
                  aria-current={current(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 text-lg font-semibold no-underline",
                    current(item.href) ? "bg-forest-tint text-forest-dark" : "text-ink",
                  )}
                >
                  {item.label}
                  <NavCount count={item.count} />
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
        {user ? (
          <div className="border-t border-line pt-2">
            <p className="px-3 py-2 text-sm text-muted">Signed in as {user.displayName}</p>
            <ul>
              {accountLinks.map((link) => (
                <li key={link.href + link.label}>
                  <AppLink href={link.href} className="flex min-h-12 items-center rounded-md px-3 text-ink no-underline">
                    {link.label}
                  </AppLink>
                </li>
              ))}
            </ul>
            {signOutAction ? (
              <form action={signOutAction}>
                <button type="submit" className="flex min-h-12 w-full items-center rounded-md px-3 text-left text-ink">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        ) : isDemo ? null : (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <AppLink href="/demo" className={cn(buttonClass("primary"), "w-full")}>
              Try the demo
            </AppLink>
            <AppLink href="/sign-in" className={cn(buttonClass("secondary"), "flex-1")}>
              Sign in
            </AppLink>
            <AppLink href="/sign-up" className={cn(buttonClass("secondary"), "flex-1")}>
              Create account
            </AppLink>
          </div>
        )}
      </div>
    </header>
  );
}
