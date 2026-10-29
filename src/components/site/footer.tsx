import { AppLink } from "../ui/base";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface no-print">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <p>
          <span className="font-serif text-lg font-semibold text-ink">KitGap</span>
          <br />
          Donated goods only, never money.
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><AppLink href="/requests" className="text-forest">Find a need</AppLink></li>
            <li><AppLink href="/organization/new" className="text-forest">Post what you need</AppLink></li>
            <li><AppLink href="/requests?tab=online" className="text-forest">Drives found online</AppLink></li>
            <li><AppLink href="/tools" className="text-forest">Count with a photo</AppLink></li>
            <li><AppLink href="/install" className="text-forest">Get the app</AppLink></li>
            <li><AppLink href="/about" className="text-forest">About</AppLink></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
