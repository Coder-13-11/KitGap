"use client";

import { Printer } from "lucide-react";
import { Button } from "../ui/button";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" /> Print
    </Button>
  );
}
