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
  count?: number;
}

// Desktop (768px and up): logo, nav links and account controls in one row.
// Phones: a compact bar with the logo and a menu button. The main places live
// in the bottom tab bar (TabBar); the menu is a sheet over the page for
// everything else, and it closes the moment a link is tapped.
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
  // Menus remember the page they were opened on, so they also close after any navigation.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [accountOpenOn, setAccountOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const accountOpen = accountOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const setAccountOpen = (open: boolean) => setAccountOpenOn(open ? pathname : null);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  // While the phone menu is open: the page behind doesn't scroll, and Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpenOn(null);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const current = (href: string) => {
    const full = base + href;
    return pathname === full || pathname.startsWith(full + "/");
  };
  const closeMenu = () => setMenuOpenOn(null);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface shadow-[0_1px_0_rgb(28_41_33/0.08)] no-print">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-1.5 sm:px-6 md:py-2.5">
        <AppLink href="/" className="flex min-h-11 items-center gap-2 rounded-md text-ink no-underline">
          <LogoMark className="size-8 md:size-9" />
          <span className="font-serif text-lg font-semibold tracking-tight md:text-xl">KitGap</span>
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
                <NavCount count={accountLinks.reduce((n, l) => n + (l.count ?? 0), 0)} />
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
                      <AppLink href={link.href} className="flex items-center rounded-md px-3 py-2.5 text-ink no-underline hover:bg-sunken">
                        {link.label}
                        <NavCount count={link.count} />
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
          ref={menuButtonRef}
          type="button"
          className="-mr-2 ml-auto grid size-11 place-items-center rounded-md text-ink hover:bg-sunken md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Menu"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        </button>
      </div>

      {menuOpen ? (
        <>
          {/* Dims the page; tapping it closes the menu. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={closeMenu}
            className="absolute inset-x-0 top-full h-dvh bg-ink/35 md:hidden"
          />
          <div
            id="mobile-menu"
            className="kg-sheet absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-surface px-4 pt-2 pb-5 shadow-card md:hidden"
          >
            {user ? <p className="px-3 pt-1 pb-2 text-sm text-muted">Signed in as {user.displayName}</p> : null}
            <nav aria-label="Menu">
              <ul className="divide-y divide-line">
                {nav.map((item) => (
                  <li key={item.href}>
                    <AppLink
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={current(item.href) ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center rounded-md px-3 font-semibold no-underline",
                        current(item.href) ? "text-forest-dark" : "text-ink",
                      )}
                    >
                      {item.label}
                      <NavCount count={item.count} />
                    </AppLink>
                  </li>
                ))}
                <li>
                  <AppLink href="/install" onClick={closeMenu} className="flex min-h-12 items-center rounded-md px-3 font-semibold text-ink no-underline">
                    Get the app
                  </AppLink>
                </li>
                {accountLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <AppLink href={link.href} onClick={closeMenu} className="flex min-h-12 items-center rounded-md px-3 text-ink no-underline">
                      {link.label}
                      <NavCount count={link.count} />
                    </AppLink>
                  </li>
                ))}
              </ul>
            </nav>
            {user ? (
              signOutAction ? (
                <form action={signOutAction} className="mt-3">
                  <button type="submit" className={cn(buttonClass("secondary"), "w-full")}>
                    Sign out
                  </button>
                </form>
              ) : null
            ) : isDemo ? null : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <AppLink href="/sign-in" onClick={closeMenu} className={buttonClass("secondary")}>
                  Sign in
                </AppLink>
                <AppLink href="/sign-up" onClick={closeMenu} className={buttonClass("primary")}>
                  Create account
                </AppLink>
              </div>
            )}
          </div>
        </>
      ) : null}
    </header>
  );
}
