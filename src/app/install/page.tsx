import type { Metadata } from "next";
import { InstallApp } from "@/components/site/install-app";
import { LogoMark } from "@/components/site/logo";
import { Container } from "@/components/ui/layout-bits";

export const metadata: Metadata = { title: "Get the app" };

const FEATURES = [
  ["Your drive in your pocket", "Check what's still short, record what arrived and pack, right at the collection table."],
  ["Hand over with a QR code", "The recipient scans it and confirms on their own phone. No account needed."],
  ["Full screen, from your home screen", "Opens like any app, with a tab bar for Home, Requests, My drives and Updates."],
];

export default function InstallPage() {
  return (
    <Container narrow className="space-y-8">
      <header className="rise space-y-4">
        <LogoMark className="size-16" />
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Get KitGap on your phone</h1>
        <p className="text-lg text-muted">
          KitGap installs straight from your browser on iPhone and Android: no app store, no download to wait for, and it&rsquo;s always the
          latest version.
        </p>
      </header>
      <InstallApp />
      <ul className="grid gap-4">
        {FEATURES.map(([title, text], i) => (
          <li key={title} className="rise tag-shape border border-line-strong bg-surface p-5 shadow-card" style={{ ["--i" as string]: i + 1 }}>
            <h2 className="font-serif text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
