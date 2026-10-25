import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Archivo_Narrow, Petrona } from "next/font/google";
import { signOutAction } from "@/actions/auth";
import { KitLauncher } from "@/components/kit/kit-launcher";
import { kitAiEnabled } from "@/server/kit/ai";
import { DemoBanner } from "@/components/site/demo-banner";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader, type AccountLink, type NavItem } from "@/components/site/header";
import { NativeShell } from "@/components/site/native-shell";
import { ServiceWorker } from "@/components/site/service-worker";
import { TabBar, type Tab } from "@/components/site/tab-bar";
import { BaseProvider } from "@/components/ui/base";
import { ToastProvider } from "@/components/ui/toast";
import { PERSONAS } from "@/server/demo/sandbox";
import { getDemoGuide } from "@/server/queries/demo-guide";
import { getMyWorkspaces } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";
import { siteUrl } from "@/server/next/supabase";
import "./globals.css";

const sans = Archivo_Narrow({
  subsets: ["latin"],
  variable: "--font-archivo-narrow",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const serif = Petrona({
  subsets: ["latin"],
  variable: "--font-petrona",
  display: "swap",
  weight: ["500", "600", "700"],
});

const DESCRIPTION =
  "Organizations post precise needs for kits and goods. School clubs and community groups adopt part of a request, collect supplies, and deliver them. The organization confirms what arrived.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "KitGap: turn a community need into a drive", template: "%s · KitGap" },
  description: DESCRIPTION,
  openGraph: { siteName: "KitGap", type: "website", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
  // Installed on an iPhone home screen, KitGap opens full screen.
  appleWebApp: { capable: true, title: "KitGap", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#234d3b",
  width: "device-width",
  initialScale: 1,
  // Lets the installed app draw under the notch; the header and tab bar pad
  // themselves with the safe-area insets.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const [workspaces, guide] = await Promise.all([getMyWorkspaces(ctx), getDemoGuide(ctx)]);

  // Four places, everywhere: Home, Find, My giving and Profile. Everything
  // else (updates, organization dashboards, settings) lives under Profile.
  const nav: NavItem[] = ctx.user
    ? [
        { href: "/home", label: "Home" },
        { href: "/requests", label: "Find" },
        { href: "/drives", label: "My giving" },
      ]
    : [
        { href: "/requests", label: "Find" },
        { href: "/about", label: "How it works" },
      ];

  const tabs: Tab[] = ctx.user
    ? [
        { href: "/home", label: "Home", icon: "home" },
        { href: "/requests", label: "Find", icon: "requests" },
        { href: "/drives", label: "My giving", icon: "drives" },
        { href: "/me", label: "Profile", icon: "profile", count: workspaces.unreadUpdates },
      ]
    : [
        { href: "/", label: "Home", icon: "home" },
        { href: "/requests", label: "Find", icon: "requests" },
        { href: "/demo", label: "Demo", icon: "demo" },
        { href: "/sign-in", label: "Sign in", icon: "signin" },
      ];

  // The account menu (desktop) and Profile page (phones) share these.
  const accountLinks: AccountLink[] = [];
  if (ctx.user) {
    accountLinks.push({ href: "/updates", label: "Updates", count: workspaces.unreadUpdates });
    for (const org of workspaces.organizations) accountLinks.push({ href: `/organization/${org.id}`, label: org.name });
    for (const group of workspaces.groups) accountLinks.push({ href: `/groups/${group.id}`, label: group.name });
    if (workspaces.isReviewer) accountLinks.push({ href: "/admin", label: "Review queue" });
    if (ctx.mode === "live") accountLinks.push({ href: "/account", label: "Account settings" });
  }

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))] standalone:max-lg:pb-[calc(3.5rem+env(safe-area-inset-bottom))] standalone:pt-[env(safe-area-inset-top)] in-data-[native=true]:max-lg:pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
        >
          Skip to main content
        </a>
        <BaseProvider base={ctx.base}>
          <ToastProvider>
          {ctx.demo ? <DemoBanner
              persona={{ key: ctx.demo.persona.key, name: ctx.demo.persona.name, short: ctx.demo.persona.short }}
              personas={PERSONAS.map((p) => ({ key: p.key, name: p.name, short: p.short }))}
              guide={guide}
            /> : null}
          <SiteHeader
            nav={nav}
            user={ctx.user ? { displayName: ctx.user.displayName } : null}
            accountLinks={accountLinks}
            signOutAction={ctx.mode === "live" && ctx.user ? signOutAction : null}
            isDemo={ctx.mode === "demo"}
          />
          <main id="main" className="flex-1 pt-6 pb-10 sm:pt-10" tabIndex={-1}>
            <ViewTransition default="page">{children}</ViewTransition>
          </main>
          <SiteFooter />
          <TabBar tabs={tabs} />
          <KitLauncher ai={kitAiEnabled()} />
          <ServiceWorker />
          <NativeShell />
          </ToastProvider>
        </BaseProvider>
      </body>
    </html>
  );
}
