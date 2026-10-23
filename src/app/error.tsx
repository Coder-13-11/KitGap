"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout-bits";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container narrow className="space-y-4">
      <h1 className="font-serif text-3xl font-semibold">Something went wrong loading this page</h1>
      <p className="text-muted">
        Nothing you entered was lost by viewing this page. Try again in a moment. If it keeps happening, mention reference{" "}
        <code className="rounded bg-sunken px-1">{error.digest ?? "unknown"}</code>.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </Container>
  );
}
