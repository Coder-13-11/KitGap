import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RequestForm } from "@/components/requests/request-form";
import { AppLink } from "@/components/ui/base";
import { cn } from "@/components/ui/cn";
import { Container, PageHeader } from "@/components/ui/layout-bits";
import { addDays, todayIn } from "@/domain/dates";
import { inputFromTemplate, REQUEST_TEMPLATES, templateFor } from "@/domain/request-templates";
import { getOrgDashboard } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const { template: templateId } = await searchParams;
  const ctx = await getAppContext();
  const back = `/organization/${id}/requests/new`;
  if (!ctx.user) redirect(`/sign-in?next=${encodeURIComponent(back)}${ctx.sessionExpired ? "&expired=1" : ""}`);
  const data = await getOrgDashboard(ctx, id);
  if (!data) notFound();
  if (data === "not_allowed") redirect(`${ctx.base}/organization/${id}`);
  const template = templateFor(templateId);
  const initial = inputFromTemplate(template, {
    location: data.org.city,
    ...(template ? { neededBy: addDays(todayIn("America/New_York"), 30) } : {}),
  });

  return (
    <Container narrow className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <AppLink href={`/organization/${id}`}>← {data.org.name}</AppLink>
      </nav>
      <PageHeader title="New request" description="Describe exactly what you need. Your answers are saved as a draft at each step." />

      <nav aria-labelledby="templates-title" className="space-y-2">
        <h2 id="templates-title" className="font-semibold">
          Start from a template <span className="font-normal text-muted">(optional)</span>
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {REQUEST_TEMPLATES.map((t) => (
            <li key={t.id}>
              <AppLink
                href={`${back}?template=${t.id}`}
                aria-current={template?.id === t.id ? "true" : undefined}
                className={cn(
                  "press block rounded-xl border px-4 py-3 no-underline",
                  template?.id === t.id ? "border-forest bg-forest-tint" : "border-line-strong bg-surface hover:border-forest/50",
                )}
              >
                <span className="block font-semibold text-ink">{t.label}</span>
                <span className="block text-sm text-muted">{t.summary}</span>
              </AppLink>
            </li>
          ))}
        </ul>
        {template ? (
          <p className="text-sm text-muted">
            Filled in from the {template.label.toLowerCase()} template. Change anything you like: the numbers, the items, the date. A KitGap
            reviewer still checks it before it&apos;s listed.{" "}
            <AppLink href={back} className="font-semibold">
              Start blank instead
            </AppLink>
          </p>
        ) : null}
      </nav>

      <RequestForm
        key={template?.id ?? "blank"}
        orgId={id}
        orgName={data.org.name}
        requestId={null}
        initial={initial}
        reviewNote={null}
        signInHref={`/sign-in?next=${encodeURIComponent(back)}`}
      />
    </Container>
  );
}
