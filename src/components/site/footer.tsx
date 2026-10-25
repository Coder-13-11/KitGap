import { AppLink } from "../ui/base";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface no-print">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-12 sm:px-6">
        <div className="max-w-sm space-y-2">
          <p className="font-serif text-2xl font-semibold tracking-tight text-ink">KitGap</p>
          <p>Donation drives for exactly what a shelter needs. KitGap handles donated goods only, never money.</p>
        </div>
        <nav aria-labelledby="footer-kitgap">
          <p id="footer-kitgap" className="font-semibold text-ink">KitGap</p>
          <ul className="mt-2 space-y-2">
            <li><AppLink href="/requests" className="text-forest">Explore requests</AppLink></li>
            <li><AppLink href="/demo" className="text-forest">Try the demo</AppLink></li>
            <li><AppLink href="/install" className="text-forest">Get the app</AppLink></li>
            <li><AppLink href="/about#how-numbers-work" className="text-forest">How the numbers work</AppLink></li>
            <li><AppLink href="/organization/new" className="text-forest">Post what you need</AppLink></li>
            <li><AppLink href="/about" className="text-forest">About and credits</AppLink></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-experiments">
          <p id="footer-experiments" className="font-semibold text-ink">Experiments</p>
          <ul className="mt-2 space-y-2">
            <li><AppLink href="/discover" className="text-forest">Find drives elsewhere</AppLink></li>
            <li><AppLink href="/tools" className="text-forest">Count with a photo</AppLink></li>
          </ul>
          <p className="mt-2 max-w-[14rem]">Outside KitGap&rsquo;s counts. Results aren&rsquo;t checked by a person.</p>
        </nav>
      </div>
    </footer>
  );
}
