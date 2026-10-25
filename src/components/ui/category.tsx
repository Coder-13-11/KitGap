import { Apple, Baby, Backpack, HeartHandshake, Package, PawPrint, Snowflake, SprayCan } from "lucide-react";
import type { ComponentType } from "react";
import { CATEGORY_LABEL } from "@/domain/phase";
import type { Category } from "@/domain/types";
import { cn } from "./cn";

// One icon and one color per kind of need, so the board can be scanned
// without reading: food is amber, school is blue, seniors rust, pets green.
// Short labels are for the icon grid; CATEGORY_LABEL is the full name.

export const CATEGORY_SHORT: Record<Category, string> = {
  food: "Food",
  school_supplies: "School",
  seniors: "Seniors",
  pets: "Pets",
  hygiene: "Hygiene",
  winter: "Winter",
  baby: "Babies",
  other: "Other",
};

const ICON: Record<Category, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  food: Apple,
  school_supplies: Backpack,
  seniors: HeartHandshake,
  pets: PawPrint,
  hygiene: SprayCan,
  winter: Snowflake,
  baby: Baby,
  other: Package,
};

// Tint for the tile, ink-dark text and a stronger icon color; all pass 4.5:1.
const TONE: Record<Category, string> = {
  food: "bg-amber-tint text-amber",
  school_supplies: "bg-info-tint text-info",
  seniors: "bg-clay-tint text-clay",
  pets: "bg-forest-tint text-forest-dark",
  hygiene: "bg-info-tint text-info",
  winter: "bg-info-tint text-info",
  baby: "bg-clay-tint text-clay",
  other: "bg-sunken text-ink",
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICON[category] ?? Package;
  return <Icon aria-hidden className={className} />;
}

/** A small tag: icon and short name. */
export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px_8px_8px_2px] px-2 py-0.5 text-sm font-semibold",
        TONE[category],
        className,
      )}
    >
      <CategoryIcon category={category} className="size-4" />
      {CATEGORY_SHORT[category]}
    </span>
  );
}

/** A big square tile for the category grid. */
export function CategoryTile({ category, label }: { category: Category; label?: string }) {
  return (
    <span className="flex flex-col items-center gap-2 text-center">
      <span className={cn("grid size-14 place-items-center rounded-2xl sm:size-16", TONE[category])}>
        <CategoryIcon category={category} className="size-7 sm:size-8" />
      </span>
      <span className="text-sm font-semibold text-ink">{label ?? CATEGORY_SHORT[category]}</span>
      <span className="sr-only">{CATEGORY_LABEL[category]}</span>
    </span>
  );
}
