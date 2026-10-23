"use client";

// Every internal link goes through AppLink so that, inside the demo, links
// stay under /demo and never lead into the real app by accident.

import Link from "next/link";
import { createContext, use, type ComponentProps } from "react";

const BaseContext = createContext<"" | "/demo">("");

export function BaseProvider({ base, children }: { base: "" | "/demo"; children: React.ReactNode }) {
  return <BaseContext value={base}>{children}</BaseContext>;
}

export function useBase(): "" | "/demo" {
  return use(BaseContext);
}

export function withBase(base: string, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  // Inside the demo, "home" is the demo's start page.
  if (base && href === "/") return base;
  if (base && (href === "/demo" || href.startsWith("/demo/") || href.startsWith("/demo?"))) return href;
  return base + href;
}

export function AppLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const base = useBase();
  return <Link href={withBase(base, href)} {...props} />;
}
