import { AppLink } from "../ui/base";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface no-print">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md space-y-1">
          <p className="font-semibold text-ink">KitGap</p>
          <p>Turn a community need into a drive your group can complete. KitGap coordinates donated goods; it does not collect or track money.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><AppLink href="/requests" className="text-forest">Explore requests</AppLink></li>
            <li><AppLink href="/about" className="text-forest">About and credits</AppLink></li>
            <li><AppLink href="/about#how-numbers-work" className="text-forest">How the numbers work</AppLink></li>
            <li><a href="/demo" className="text-forest">Try the demo</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
