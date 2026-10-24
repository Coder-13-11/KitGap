import type { Metadata } from "next";
import { PhotoCounter } from "@/components/tools/photo-counter";
import { Container } from "@/components/ui/layout-bits";

export const metadata: Metadata = { title: "Count with a photo" };

function parseKit(raw: string | undefined): { name: string; need: number }[] | undefined {
  if (!raw) return undefined;
  const rows = raw
    .split(",")
    .slice(0, 6)
    .map((part) => {
      const [name, need] = part.split(":");
      return { name: (name ?? "").trim().slice(0, 40), need: Math.max(1, Math.min(20, Number(need) || 1)) };
    })
    .filter((r) => r.name);
  return rows.length ? rows : undefined;
}

export default async function ToolsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const mode = one("mode");
  const signup = one("signup");

  return (
    <div className="-mt-6 space-y-10 sm:-mt-10">
      <section className="border-b border-line bg-sunken">
        <Container className="py-10 sm:py-14">
          <h1 className="rise font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Count with a photo</h1>
          <p className="rise mt-3 max-w-2xl text-lg text-muted">
            Snap a pile of bags, backpacks, boxes or pencils and get the number. Check that every kit is complete. Fix anything it gets
            wrong with a tap.
          </p>
          <p className="rise mt-3 max-w-2xl text-sm text-muted">
            <span className="font-semibold text-ink">Experiment.</span> A count is a suggestion. It never changes a drive&rsquo;s numbers;
            coordinators still record what arrived.
          </p>
        </Container>
      </section>

      <Container className="space-y-12">
        <PhotoCounter
          initialMode={mode === "kit" || mode === "one" ? mode : "pile"}
          initialKit={parseKit(one("kit"))}
          signupId={signup && /^[0-9a-f-]{36}$/i.test(signup) ? signup : undefined}
        />

        <section aria-labelledby="how-title" className="tag-shape grid gap-6 border border-line-strong bg-surface p-6 shadow-card sm:p-8 md:grid-cols-2">
          <div>
            <h2 id="how-title" className="font-serif text-2xl font-semibold">
              How well does it count?
            </h2>
            <p className="mt-2 text-muted">
              We tested it on 72 labelled photos of 2 to 10 things. It got the exact number in 61 of them (85%) and was off by at most one
              in 68 (94%). On 13 photos of real donations it was within one on 10. Neat rows of bags and boxes count best. Tight bundles of
              pencils and stacked rolls count worst, which is why it asks you to spread things out.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold">What happens to my photo?</h2>
            <p className="mt-2 text-muted">
              Nothing leaves your device. The counting model runs inside your browser, and the photo is gone when you close the page. Always
              check the number before you rely on it.
            </p>
          </div>
        </section>
      </Container>
    </div>
  );
}
