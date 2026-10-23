import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { signOutAction } from "@/actions/auth";
import { DemoBanner } from "@/components/site/demo-banner";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader, type AccountLink, type NavItem } from "@/components/site/header";
import { BaseProvider } from "@/components/ui/base";
import { ToastProvider } from "@/components/ui/toast";
import { getMyWorkspaces } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";
import "./globals.css";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap", weight: ["600"] });

export const metadata: Metadata = {
  title: { default: "KitGap: turn a community need into a drive", template: "%s · KitGap" },
  description:
    "Organizations post precise needs for kits and goods. School clubs and community groups adopt part of a request, collect supplies, and deliver them. The organization confirms what arrived.",
};

export const viewport: Viewport = { themeColor: "#f8f7f3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const workspaces = await getMyWorkspaces(ctx);

  const nav: NavItem[] = [{ href: "/requests", label: "Explore requests" }];
  if (ctx.user) nav.push({ href: "/drives", label: "My drives" });
  if (workspaces.organizations.length === 1) {
    nav.push({ href: `/organization/${workspaces.organizations[0].id}`, label: "My organization" });
  } else if (workspaces.organizations.length > 1) {
    nav.push({ href: "/organization", label: "My organizations" });
  }
  if (workspaces.isReviewer) nav.push({ href: "/admin", label: "Review queue" });
  if (ctx.user) nav.push({ href: "/updates", label: "Updates", count: workspaces.unreadUpdates });

  const accountLinks: AccountLink[] = [];
  if (ctx.user) {
    if (ctx.mode === "live") accountLinks.push({ href: "/account", label: "Account settings" });
    for (const group of workspaces.groups) accountLinks.push({ href: `/groups/${group.id}`, label: `${group.name}` });
    for (const org of workspaces.organizations) accountLinks.push({ href: `/organization/${org.id}/settings`, label: `${org.name} settings` });
    if (ctx.mode === "live") {
      accountLinks.push({ href: "/organization/new", label: "Register an organization" });
      accountLinks.push({ href: "/groups/new", label: "Create a group" });
    }
  }

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
        >
          Skip to main content
        </a>
        <BaseProvider base={ctx.base}>
          <ToastProvider>
          {ctx.demo ? <DemoBanner persona={ctx.demo.persona} /> : null}
          <SiteHeader
            nav={nav}
            user={ctx.user ? { displayName: ctx.user.displayName } : null}
            accountLinks={accountLinks}
            signOutAction={ctx.mode === "live" && ctx.user ? signOutAction : null}
            isDemo={ctx.mode === "demo"}
          />
          <main id="main" className="flex-1 pt-6 pb-10 sm:pt-10" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          </ToastProvider>
        </BaseProvider>
      </body>
    </html>
  );
}
