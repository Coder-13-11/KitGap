import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApproveButton, ContactConfirmButton, ReturnForm } from "@/components/admin/review-forms";
import { AppLink } from "@/components/ui/base";
import { Container, PageHeader, Panel, Section } from "@/components/ui/layout-bits";
import { Pill } from "@/components/ui/status";
import { formatCalendarDate, formatTimestamp } from "@/domain/dates";
import { countNoun } from "@/domain/text";
import { getReviewQueue } from "@/server/queries/organization";
import { getAppContext } from "@/server/next/context";

export const metadata: Metadata = { title: "Review queue" };

export default async function AdminPage() {
  const ctx = await getAppContext();
  if (!ctx.user) redirect(`/sign-in?next=/admin${ctx.sessionExpired ? "&expired=1" : ""}`);
  const queue = await getReviewQueue(ctx);
  if (queue === "not_allowed") {
    return (
      <Container narrow className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold">Only KitGap reviewers can see this page</h1>
        <p>Reviewer access is granted by the people running KitGap, never from inside the app.</p>
      </Container>
    );
  }
  return (
    <Container className="space-y-8">
      <PageHeader
        title="Review queue"
        description="Check that each request is a real, specific need from a reachable organization before it's listed publicly."
      />
      <Section title={`Requests waiting for review (${queue.requests.length})`} id="requests">
        {queue.requests.length === 0 ? (
          <p className="text-muted">Nothing is waiting.</p>
        ) : (
          <ul className="space-y-4">
            {queue.requests.map((r) => (
              <li key={r.id}>
                <Panel className="grid gap-5 lg:grid-cols-[1fr_20rem]">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      <AppLink href={`/requests/${r.id}`}>{r.title}</AppLink>
                    </h3>
                    <p>
                      {r.orgName} · {countNoun(r.targetQuantity ?? 0, r.unitName)}
                      {r.neededBy ? ` · needed by ${formatCalendarDate(r.neededBy)}` : ""}
                    </p>
                    <p className="text-sm text-muted">Submitted {r.submittedAt ? formatTimestamp(r.submittedAt, "America/New_York") : ""}</p>
                    <div className="rounded-md bg-sunken p-3 text-sm">
                      <p className="font-semibold">Organization contact (private)</p>
                      <p>
                        {r.orgContact.name}
                        {r.orgContact.email ? ` · ${r.orgContact.email}` : ""}
                        {r.orgContact.phone ? ` · ${r.orgContact.phone}` : ""}
                      </p>
                      <p className="mt-1">{r.orgContact.confirmedAt ? <Pill tone="forest">Contact confirmed</Pill> : <Pill tone="amber">Contact not confirmed yet</Pill>}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <ApproveButton requestId={r.id} />
                    <ReturnForm requestId={r.id} />
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Organizations"
        id="organizations"
        description="Mark a contact confirmed only after you've reached the person by phone or email and they confirmed the organization's need. That's all the label means."
      >
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {queue.organizations.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {o.name} <span className="font-normal text-muted">· {o.city}</span>
                </p>
                <p className="text-sm text-muted">
                  {o.contactName}
                  {o.contactEmail ? ` · ${o.contactEmail}` : ""}
                  {o.contactPhone ? ` · ${o.contactPhone}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {o.contactConfirmedAt ? <Pill tone="forest">Confirmed</Pill> : <Pill tone="amber">Not confirmed</Pill>}
                <ContactConfirmButton workspaceId={o.id} confirmed={Boolean(o.contactConfirmedAt)} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </Container>
  );
}
