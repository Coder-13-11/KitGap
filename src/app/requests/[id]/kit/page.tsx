import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { KitChat } from "@/components/kit/kit-chat";
import { AppLink } from "@/components/ui/base";
import { Container } from "@/components/ui/layout-bits";
import { kitAiEnabled } from "@/server/kit/ai";
import { loadKitContext } from "@/server/kit/input";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Ask Kit" };

// Kit, the helper for one need. Only the people running it see Kit: the
// organization that posted it and the groups running a drive for it.
export default async function KitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ask?: string }> }) {
  const { id } = await params;
  const { ask } = await searchParams;
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(`/requests/${id}/kit`)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const kit = await loadKitContext(ctx, id);
  if (!kit) notFound();

  return (
    <Container className="max-w-3xl space-y-4">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/requests/${id}`}>← {kit.input.title}</AppLink>
      </nav>
      <KitChat
        requestId={id}
        input={kit.input}
        nearbyOrgs={kit.nearbyOrgs}
        imagePath={`${ctx.base}/requests/${id}/post-image`}
        manageHref={kit.isOrgMember ? `/organization/${kit.orgId}/requests/${id}` : null}
        ai={kitAiEnabled()}
        initialAsk={ask === "instagram" || ask === "email" || ask === "why" || ask === "partners" || ask === "stats" ? ask : null}
      />
    </Container>
  );
}
