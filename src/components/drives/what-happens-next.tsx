import { cn } from "../ui/cn";

// The life of a drive, told before anyone commits to one.
export function WhatHappensNext({
  orgName,
  isKit,
  neededBy,
  share,
  titleId = "next-title",
  className,
}: {
  orgName: string;
  isKit: boolean;
  neededBy: string | null;
  // "20 kits", once a number is chosen.
  share: string | null;
  titleId?: string;
  className?: string;
}) {
  const steps = [
    {
      when: "Right away",
      title: "Your share is set aside",
      detail: share
        ? `${share} ${share.startsWith("1 ") ? "is" : "are"} reserved for your group, so no other group takes the same share.`
        : "The number you choose is reserved for your group, so no other group takes the same share.",
    },
    {
      when: "Next",
      title: "Invite your group",
      detail: "Share one link. Members say what they'll bring, and your supply list shows what's still missing.",
    },
    {
      when: "As donations arrive",
      title: isKit ? "Collect and pack" : "Collect",
      detail: isKit
        ? "Record what actually arrives, then pack complete kits. A promise doesn't count until the item is in your hands."
        : "Record what actually arrives. A promise doesn't count until the item is in your hands.",
    },
    {
      when: neededBy ? `By ${neededBy}` : "Before the deadline",
      title: `Hand everything to ${orgName}`,
      detail: "The drop-off details appear on your drive page once it starts.",
    },
    {
      when: "Last",
      title: `${orgName} confirms what arrived`,
      detail: "Only what they confirm counts as delivered. That's the number everyone sees.",
    },
  ];

  return (
    <section aria-labelledby={titleId} className={cn("tag-shape border border-line-strong bg-surface p-5 shadow-card", className)}>
      <h2 id={titleId} className="font-serif text-2xl font-semibold tracking-tight">
        What happens next
      </h2>
      <ol className="mt-5">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 ? <span aria-hidden className="absolute top-7 bottom-0 left-[0.7rem] w-px bg-line" /> : null}
            <span
              aria-hidden
              className={cn(
                "tabular relative grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                i === 0 ? "bg-forest text-white" : "border border-line-strong bg-paper text-ink",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{step.title}</p>
              <p className="text-sm text-muted">{step.when}</p>
              <p className="mt-1 text-sm">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
