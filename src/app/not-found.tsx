import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout-bits";

export default function NotFound() {
  return (
    <Container narrow className="space-y-4">
      <h1 className="font-serif text-3xl font-semibold">We couldn't find that page</h1>
      <p className="text-muted">The link may be wrong, or the request may not be published. Drafts are visible only to their organization.</p>
      <ButtonLink href="/requests">Explore requests</ButtonLink>
    </Container>
  );
}
