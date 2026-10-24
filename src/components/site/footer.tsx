import { AppLink } from "../ui/base";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface no-print">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm space-y-2">
          <p className="font-serif text-2xl font-semibold tracking-tight text-ink">KitGap</p>
          <p>Give what's actually needed. KitGap coordinates donated goods. It does not collect or track money.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><AppLink href="/requests" className="text-forest">Explore requests</AppLink></li>
            <li><AppLink href="/about" className="text-forest">About and credits</AppLink></li>
            <li><AppLink href="/about#how-numbers-work" className="text-forest">How the numbers work</AppLink></li>
            <li><AppLink href="/organization/new" className="text-forest">Post what you need</AppLink></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
