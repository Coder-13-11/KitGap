import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, Building2, ChevronRight, ClipboardCheck, Download, HelpCircle, Plus, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/actions/auth";
import { AppLink } from "@/components/ui/base";
import { buttonClass } from "@/components/ui/button-class";
import { Container } from "@/components/ui/layout-bits";
import { getAppContext } from "@/server/next/context";
import { getMyWorkspaces } from "@/server/queries/organization";

export const metadata: Metadata = { title: "Profile" };

function Row({ href, icon, label, detail, count }: { href: string; icon: ReactNode; label: string; detail?: string; count?: number }) {
  return (
    <li>
      <AppLink href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-sunken">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-tint text-forest [&_svg]:size-5">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{label}</span>
          {detail ? <span className="block text-sm text-muted">{detail}</span> : null}
        </span>
        {count ? (
          <span className="tabular min-w-6 rounded-full bg-clay px-1.5 text-center text-sm font-semibold text-white">
            {count > 99 ? "99+" : count}
            <span className="sr-only"> new</span>
          </span>
        ) : null}
        <ChevronRight aria-hidden className="size-4 text-muted" />
      </AppLink>
    </li>
  );
}

// Everything that isn't one of the three main places: updates, the
// organizations and groups you belong to, settings and help.
export default async function ProfilePage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/me${ctx.sessionExpired ? "&expired=1" : ""}`);
  const workspaces = await getMyWorkspaces(ctx);
  const list = "tag-shape divide-y divide-line overflow-hidden border border-line-strong bg-surface shadow-card";

  return (
    <Container narrow className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{ctx.user.displayName}</h1>
        <p className="text-muted">{ctx.mode === "demo" ? "Sample person in the demo" : "Your profile"}</p>
      </header>

      <ul className={list}>
        <Row href="/updates" icon={<Bell />} label="Updates" detail="News about the needs and drives you're part of" count={workspaces.unreadUpdates} />
      </ul>

      <section aria-labelledby="places-title" className="space-y-2">
        <h2 id="places-title" className="text-sm font-semibold text-muted">
          Your places
        </h2>
        <ul className={list}>
          {workspaces.organizations.map((org) => (
            <Row key={org.id} href={`/organization/${org.id}`} icon={<Building2 />} label={org.name} detail="Your organization: needs and deliveries" />
          ))}
          {workspaces.groups.map((group) => (
            <Row key={group.id} href={`/groups/${group.id}`} icon={<Users />} label={group.name} detail="Your group" />
          ))}
          {workspaces.isReviewer ? <Row href="/admin" icon={<ClipboardCheck />} label="Review queue" detail="Check new needs before they're listed" /> : null}
          {ctx.mode === "live" && workspaces.organizations.length === 0 ? (
            <Row href="/organization/new" icon={<Plus />} label="Add your organization" detail="Shelters, food pantries, schools, senior homes, animal shelters" />
          ) : null}
          <Row href="/drives/new" icon={<Plus />} label="Start a drive" detail="For a place you already know, with your club or friends" />
        </ul>
      </section>

      <section aria-labelledby="more-title" className="space-y-2">
        <h2 id="more-title" className="text-sm font-semibold text-muted">
          More
        </h2>
        <ul className={list}>
          {ctx.mode === "live" ? <Row href="/account" icon={<Settings />} label="Account settings" /> : null}
          <Row href="/install" icon={<Download />} label="Get the app" />
          <Row href="/about" icon={<HelpCircle />} label="How KitGap works" />
        </ul>
      </section>

      {ctx.mode === "live" ? (
        <form action={signOutAction}>
          <button type="submit" className={`${buttonClass("secondary")} w-full`}>
            Sign out
          </button>
        </form>
      ) : null}
    </Container>
  );
}
