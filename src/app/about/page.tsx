import type { Metadata } from "next";
import { AppLink } from "@/components/ui/base";
import { Container, Panel, Section } from "@/components/ui/layout-bits";

export const metadata: Metadata = { title: "About and credits" };

export default function AboutPage() {
  return (
    <Container narrow className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">About KitGap</h1>
        <p className="text-lg text-muted">
          KitGap turns an organization's specific need, such as 100 school-supply kits, into drives that school clubs and community groups
          can take on and finish, with numbers everyone can trust.
        </p>
      </header>

      <Section title="What KitGap is, and isn't" id="what">
        <ul className="list-disc space-y-2 pl-5">
          <li>It coordinates donated goods: who is collecting what, how much is promised, and what the receiving organization confirmed.</li>
          <li>
            Wish lists and tools such as RightGift ship items a person buys. NeedsList matches emergency needs. Local critical-needs lists are
            usually for cash. KitGap is for a group that adopts part of a request, collects and packs kits, and the receiving organization
            confirms what arrived.
          </li>
          <li>It doesn't collect money. An organization may link to its own fundraising page; KitGap doesn't track it, and money never counts as kits.</li>
          <li>Beneficiaries don't have profiles. Requests describe the people they help only in general terms.</li>
        </ul>
      </Section>

      <Section title="How the numbers work" id="how-numbers-work">
        <Panel className="space-y-3">
          <p>
            <strong>Promised</strong> is what groups have committed to and not yet had accepted. <strong>Confirmed received</strong> is only what
            the receiving organization accepted after a delivery. A request is <strong>fulfilled</strong> only when confirmed received reaches
            the requested quantity.
          </p>
          <p>
            <strong>Still available</strong> = requested − confirmed received − promised. When a group withdraws, only the part it hasn't
            delivered is released; anything already accepted stays counted, and anything awaiting the organization's review stays reserved
            until they decide.
          </p>
          <p>
            Inside a drive, a <strong>pledge</strong> is a member's promise. Supplies count as <strong>collected</strong> only when a coordinator
            records them as received and usable. The number of complete kits you can pack is limited by the scarcest item: with 20 backpacks,
            30 notebooks and 20 pencil packs, a kit of 1 backpack, 2 notebooks and 1 pencil pack can be packed 15 times.
          </p>
          <p>
            Kits move through separate stages (packed, delivered and awaiting review, confirmed received, or not accepted and needing
            follow-up), so no kit is ever counted twice.
          </p>
        </Panel>
      </Section>

      <Section title="What “Contact confirmed” means" id="contact-confirmed">
        <p>
          A KitGap reviewer reached the organization's contact person by phone or email and they confirmed the request. It isn't a check of
          tax status, a government endorsement, or an audit. Every request is also reviewed by a person before it's listed.
        </p>
      </Section>

      <Section title="Privacy" id="privacy">
        <ul className="list-disc space-y-2 pl-5">
          <li>Public pages show requests, organization and group names, and totals. They never show contributors' names, email addresses, or drop-off details.</li>
          <li>Drop-off instructions and contacts are visible only to the organization and to groups running a drive for that request.</li>
          <li>Your email address is used only to sign in and is never shown to anyone in KitGap.</li>
        </ul>
      </Section>

      <Section title="Credits" id="credits">
        <Panel className="space-y-3">
          <p>
            KitGap was created for the 2026 Congressional App Challenge (Florida's 15th Congressional District) by a student developer. The
            student set the product goals, reviewed the design and decisions, and tested the app; the full account of who did what is in
            the project's documentation.
          </p>
          <p>
            <strong>AI assistance:</strong> Claude, an AI model made by Anthropic, was used through Claude Code to help with research, design,
            writing code, tests and documentation. See <code className="rounded bg-sunken px-1">docs/ai-usage.md</code> in the source code for
            details.
          </p>
          <p>
            <strong>AI inside KitGap:</strong> Kit, the helper, writes its answers and drafts with the Gemma 4 model and listens and speaks
            with Whisper and Kokoro, through the University of Florida&apos;s NaviGator AI service. Kit only states numbers from KitGap&apos;s own
            data, and only for signed-in people and demo visitors. The photo counter runs a model in your browser, and &ldquo;Found
            online&rdquo; searches the web with Exa.
          </p>
          <p>
            <strong>Built with:</strong> Next.js, React, TypeScript, Tailwind CSS, Supabase (authentication and Postgres), postgres.js,
            Lucide icons, and the Petrona and Archivo Narrow typefaces (SIL Open Font License).
          </p>
          <p>
            <strong>Photographs</strong> (Unsplash License): backpack by{" "}
            <a href="https://unsplash.com/photos/_H0fjILH5Vw">Sun Lingyan</a>, notebook by{" "}
            <a href="https://unsplash.com/photos/vdaJJbls3xE">Marissa Grootes</a>, pencils by{" "}
            <a href="https://unsplash.com/photos/l3N9Q27zULw">Jess Bailey</a>.
          </p>
          <p>
            <strong>Sample data:</strong> every organization, group and person in the demo is fictional.
          </p>
        </Panel>
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
