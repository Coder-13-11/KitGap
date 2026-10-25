import "server-only";

// The guided tour shown in the demo bar. Each step is checked against the
// visitor's own sandbox, so a step ticks off only once it really happened.

import { read } from "../services/core";
import { DEMO_IDS, type Persona } from "../demo/sandbox";
import type { AppContext } from "../next/context";

export interface GuideStep {
  persona: Persona["key"];
  who: string;
  title: string;
  hint: string;
  // A path inside the demo, without the "/demo" prefix.
  href: string;
  done: boolean;
}

export interface DemoGuide {
  steps: GuideStep[];
  // Index of the first step not done.
  current: number;
  // The organization has confirmed a delivery: the part that matters is done.
  complete: boolean;
}

export async function getDemoGuide(ctx: AppContext): Promise<DemoGuide | null> {
  if (ctx.mode !== "demo") return null;

  const state = await read(ctx, async (tx) => {
    const [drive] = await tx`
      select id from commitments
      where request_id = ${DEMO_IDS.kitRequest} and group_id = ${DEMO_IDS.group} and status = 'active'
      order by created_at desc limit 1
    `;
    const driveId = (drive?.id as string | undefined) ?? null;
    if (!driveId) return { driveId, pledged: false, checkedIn: false, delivered: false, deliveryId: null, reviewed: false };

    const [pledge] = await tx`select 1 from pledges where commitment_id = ${driveId} and user_id = ${DEMO_IDS.sam} limit 1`;
    const [counts] = await tx`
      select
        (select count(*)::int from request_components where request_id = ${DEMO_IDS.kitRequest}) as components,
        (select count(distinct component_id)::int from collection_entries
          where commitment_id = ${driveId} and voided_at is null and usable_quantity > 0) as received
    `;
    const deliveries = await tx`
      select id, status from deliveries where commitment_id = ${driveId} and status <> 'cancelled' order by submitted_at desc
    `;
    const reviewed = deliveries.some((d) => d.status === "reviewed");
    const waiting = deliveries.find((d) => d.status === "submitted");
    return {
      driveId,
      pledged: Boolean(pledge),
      checkedIn: Number(counts.received) >= Number(counts.components),
      delivered: deliveries.length > 0,
      deliveryId: ((waiting ?? deliveries[0])?.id as string | undefined) ?? null,
      reviewed,
    };
  });

  const drivePath = state.driveId ? `/drives/${state.driveId}` : `/requests/${DEMO_IDS.kitRequest}`;
  const steps: GuideStep[] = [
    {
      persona: "coordinator",
      who: "Jordan, club coordinator",
      title: "Offer to help with a need",
      hint: "Tap \"I'll help with 20 kits\". They're set aside for your club right away.",
      href: `/requests/${DEMO_IDS.kitRequest}`,
      done: Boolean(state.driveId),
    },
    {
      persona: "contributor",
      who: "Sam, club member",
      title: "Pledge something that's short",
      hint: "Promise 10 notebooks. Watch it count as promised, not collected.",
      href: `${drivePath}#pledge`,
      done: state.pledged,
    },
    {
      persona: "coordinator",
      who: "Jordan, club coordinator",
      title: "Check in what arrived",
      hint: "Record 20 backpacks, 40 notebooks (10 from Sam's pledge) and 20 pencil packs.",
      href: `${drivePath}#record`,
      done: state.checkedIn,
    },
    {
      persona: "coordinator",
      who: "Jordan, club coordinator",
      title: "Pack kits and hand them over",
      hint: "Pack the complete kits, then report the delivery. It's still not counted as received.",
      href: `${drivePath}#packing`,
      done: state.delivered,
    },
    {
      persona: "organization",
      who: "Maya, Riverbend Family Center",
      title: "Confirm what arrived",
      hint: "Review the delivery. Accept all, or part with a reason. Only this moves the count.",
      href: state.deliveryId ? `/organization/${DEMO_IDS.org}/deliveries/${state.deliveryId}` : `/organization/${DEMO_IDS.org}`,
      done: state.reviewed,
    },
    {
      persona: "contributor",
      who: "Sam, club member",
      title: "See where the notebooks went",
      hint: "Sam's drive page now shows the kits as confirmed. Then open the club's public record.",
      href: drivePath,
      done: false,
    },
  ];

  // The last step is a look-around with nothing to check, so the tour is
  // complete once the organization has confirmed a delivery.
  const firstOpen = steps.findIndex((s) => !s.done);
  return { steps, current: firstOpen === -1 ? steps.length : firstOpen, complete: state.reviewed };
}
