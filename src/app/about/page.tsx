import type { Metadata } from "next";
import { AppLink } from "@/components/ui/base";
import { Container, Panel, Section } from "@/components/ui/layout-bits";
import { RequestProgress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Container narrow className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">About KitGap</h1>
        <p className="text-lg text-muted">
          Food pantries, shelters, schools and other local places post exactly what they need. People bring it, and the place confirms
          what showed up. No money changes hands on KitGap, only donated goods.
        </p>
      </header>

      <Section title="How the numbers work" id="how-numbers-work">
        <Panel className="space-y-5">
          <p>
            Say a pantry asks for 40 food bags and a club offers to bring 24. So far the pantry has confirmed 12, and is checking 4
            more that were just dropped off. Its page would look like this:
          </p>
          <RequestProgress totals={{ target: 40, accepted: 12, pendingReview: 4, reserved: 12, available: 16 }} unitName="bag" />

          <dl className="space-y-3 border-t border-line pt-5">
            <div>
              <dt className="font-semibold">Confirmed received</dt>
              <dd>The pantry got it and said so. This is the only number that counts as done.</dd>
            </div>
            <div>
              <dt className="font-semibold">Delivered, awaiting review</dt>
              <dd>Dropped off, but the pantry hasn&rsquo;t checked it yet.</dd>
            </div>
            <div>
              <dt className="font-semibold">Promised by groups</dt>
              <dd>Someone said they&rsquo;ll bring it. A promise isn&rsquo;t a delivery.</dd>
            </div>
            <div>
              <dt className="font-semibold">Still available</dt>
              <dd>Nobody has offered to bring these yet. This is where you can help.</dd>
            </div>
          </dl>

          <p className="border-t border-line pt-5">
            <strong>Kits:</strong> a kit only counts when every item is in it. If each kit needs 1 backpack and 2 notebooks, then 20
            backpacks and 30 notebooks make 15 kits, not 20.
          </p>
        </Panel>
      </Section>

      <Section title="What “Contact confirmed” means" id="contact-confirmed">
        <p>
          Someone from KitGap called or emailed the organization and they confirmed the request is real. It isn&rsquo;t a background
          check or an endorsement.
        </p>
      </Section>

      <Section title="Privacy" id="privacy">
        <ul className="list-disc space-y-2 pl-5">
          <li>Public pages show what&rsquo;s needed and the totals. They never show who pledged, email addresses or drop-off details.</li>
          <li>Drop-off details are only shown to the organization and the groups helping it.</li>
          <li>Your email is only used to sign in.</li>
        </ul>
      </Section>

      <Section title="Credits" id="credits">
        <div className="space-y-3">
          <p>
            Made by a student for the 2026 Congressional App Challenge (Florida&rsquo;s 15th district). Parts of the code were written
            with Claude Code, an AI assistant; <code className="rounded bg-sunken px-1">docs/ai-usage.md</code> in the source says
            what it did.
          </p>
          <p>
            Kit, the in-app helper, uses an AI model through the University of Florida&rsquo;s NaviGator service. It only quotes numbers
            from KitGap&rsquo;s own data. The photo counter runs a model on your own device, and &ldquo;Found online&rdquo; searches
            the web with Exa.
          </p>
          <p>
            Photos from Unsplash: backpack by <a href="https://unsplash.com/photos/_H0fjILH5Vw">Sun Lingyan</a>, notebook by{" "}
            <a href="https://unsplash.com/photos/vdaJJbls3xE">Marissa Grootes</a>, pencils by{" "}
            <a href="https://unsplash.com/photos/l3N9Q27zULw">Jess Bailey</a>. Everyone in the demo is made up.
          </p>
        </div>
      </Section>

      <p>
        <AppLink href="/requests" className="font-semibold">
          Find a need
        </AppLink>{" "}
        or <a href="/demo" className="font-semibold text-forest">try the demo</a>.
      </p>
    </Container>
  );
}
