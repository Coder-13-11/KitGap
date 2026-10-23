import type { Metadata } from "next";
import { cookies } from "next/headers";
import { resetDemoAction, startDemoAction, switchPersonaAction } from "@/actions/demo";
import { Container, Panel } from "@/components/ui/layout-bits";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button-class";
import { db } from "@/server/db/client";
import { DEMO_COOKIE, DEMO_IDS, PERSONAS, sandboxExists, verifySandboxCookie } from "@/server/demo/sandbox";

export const metadata: Metadata = { title: "Try the demo" };

const STEPS: { persona: string; path: string; title: string; detail: string; expect: string }[] = [
  {
    persona: "coordinator",
    path: `/requests/${DEMO_IDS.kitRequest}`,
    title: "Start a drive for 20 kits",
    detail: "As Jordan, the club coordinator, open the school-supply request and adopt 20 of the 100 kits.",
    expect: "The drive needs 20 backpacks, 40 notebooks and 20 pencil packs. The request shows 80 kits still open.",
  },
  {
    persona: "contributor",
    path: "/drives",
    title: "Pledge 10 notebooks",
    detail: "As Sam, a club member, open the club's drive and pledge 10 notebooks.",
    expect: "Notebooks show 10 pledged and 30 still needed. Collected stays at 0: a pledge is only a promise.",
  },
  {
    persona: "coordinator",
    path: "/drives",
    title: "Record what arrived and pack kits",
    detail: "As Jordan, record 20 backpacks, 30 notebooks (10 of them from Sam's pledge) and 20 pencil packs.",
    expect: "“10 more notebooks complete the remaining 20 kits.” You can pack 15 now. Pack them, then report a delivery of 15.",
  },
  {
    persona: "organization",
    path: `/organization/${DEMO_IDS.org}`,
    title: "Confirm what arrived",
    detail: "As Maya at the receiving organization, review the delivery. Try accepting 13 and not accepting 2, with a reason.",
    expect: "The request shows 13 confirmed received. Jordan's drive shows 2 kits needing follow-up.",
  },
  {
    persona: "coordinator",
    path: "/drives",
    title: "Follow up and finish",
    detail: "As Jordan, mark the 2 kits fixed, record 10 more notebooks, pack the last 5 kits and report a delivery of 7.",
    expect: "After Maya accepts the 7, the drive shows all 20 kits confirmed received.",
  },
  {
    persona: "organization",
    path: `/organization/${DEMO_IDS.org}/requests/new`,
    title: "Post a new request",
    detail: "As Maya, draft a new request and submit it. Then switch to Riley, the KitGap reviewer, to approve it.",
    expect: "The request isn't listed publicly until Riley approves it.",
  },
];

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sandboxId = verifySandboxCookie(cookieStore.get(DEMO_COOKIE)?.value);
  const ready = sandboxId ? await sandboxExists(db(), sandboxId) : false;

  return (
    <Container narrow className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-clay">Demo with sample data</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Try KitGap with sample data</h1>
        <p className="text-lg text-muted">
          You get a private copy of KitGap with a fictional family center, a fictional school club and a 100-kit school-supply request.
          Switch between four sample people to see each side of a drive. Nothing you do here affects real requests or other visitors.
        </p>
      </header>

      {params.expired ? (
        <Notice tone="info" title="Your earlier demo was cleared">
          Demos are removed after a day without use. Start a fresh one below.
        </Notice>
      ) : null}
      {params.reset ? (
        <Notice tone="success" live="polite" title="Demo reset">
          Everything is back to the starting state: one 100-kit request with no drives yet.
        </Notice>
      ) : null}

      {!ready ? (
        <Panel className="space-y-4">
          <h2 className="text-xl font-semibold">Start the demo</h2>
          <p>It takes a few seconds to set up your private copy. It stays available in this browser for a day.</p>
          <form action={startDemoAction}>
            <input type="hidden" name="persona" value="coordinator" />
            <button type="submit" className={buttonClass("primary")}>
              Start the demo
            </button>
          </form>
        </Panel>
      ) : (
        <>
          <section aria-labelledby="walkthrough-title" className="space-y-4">
            <h2 id="walkthrough-title" className="text-2xl font-semibold">
              Walkthrough
            </h2>
            <p className="text-muted">Each step opens the right page as the right person. The expected numbers let you check the math.</p>
            <ol className="space-y-3">
              {STEPS.map((step, i) => {
                const persona = PERSONAS.find((p) => p.key === step.persona)!;
                return (
                  <li key={step.title} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-muted">
                          Step {i + 1} · as {persona.name}
                        </p>
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <p>{step.detail}</p>
                        <p className="text-sm text-muted">
                          <span className="font-semibold text-ink">Expect: </span>
                          {step.expect}
                        </p>
                      </div>
                      <form action={switchPersonaAction} className="shrink-0">
                        <input type="hidden" name="persona" value={persona.key} />
                        <input type="hidden" name="next" value={step.path} />
                        <button type="submit" className={buttonClass("secondary", "sm")}>
                          Go as {persona.name.split(" ")[0]}
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="people-title" className="space-y-3">
            <h2 id="people-title" className="text-2xl font-semibold">
              The sample people
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PERSONAS.map((p) => (
                <li key={p.key} className="rounded-lg border border-line bg-surface p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">{p.role}</p>
                  <p className="mt-1 text-sm">{p.description}</p>
                  <form action={switchPersonaAction} className="mt-3">
                    <input type="hidden" name="persona" value={p.key} />
                    <button type="submit" className={buttonClass("secondary", "sm")}>
                      Continue as {p.name.split(" ")[0]}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          <Panel className="space-y-2">
            <h2 className="text-lg font-semibold">Start over</h2>
            <p className="text-muted">Resetting removes everything you did and restores the starting state.</p>
            <form action={resetDemoAction}>
              <button type="submit" className={buttonClass("secondary")}>
                Reset the demo
              </button>
            </form>
          </Panel>
        </>
      )}

      <p className="text-sm text-muted">
        The demo runs KitGap's real rules and database checks, in a private copy of the database made just for you. Its people are
        fixed sample accounts, so it doesn't show real sign-in.
      </p>
    </Container>
  );
}
