import { KitPacking } from "../site/kit-packing";
import { Container } from "./layout-bits";

// What a screen shows while its data loads: a kit being packed, with the
// label underneath ("Packing the drive…"). The variant is kept so each route
// can say what kind of page is coming, though they all share one look.
export function PageSkeleton({
  label,
  narrow = false,
}: {
  label: string;
  variant?: "list" | "dashboard" | "detail" | "home";
  narrow?: boolean;
}) {
  return (
    <Container narrow={narrow} className="grid min-h-[55vh] place-items-center">
      <KitPacking label={label} />
    </Container>
  );
}
