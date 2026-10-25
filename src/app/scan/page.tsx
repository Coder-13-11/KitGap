import type { Metadata } from "next";
import { QrScan } from "@/components/site/qr-scan";
import { Container } from "@/components/ui/layout-bits";

export const metadata: Metadata = { title: "Scan a code" };

export default function ScanPage() {
  return (
    <Container narrow className="space-y-6">
      <header className="rise space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Scan a KitGap code</h1>
        <p className="text-lg text-muted">
          Receiving kits? Scan the receipt QR code the club shows you to confirm what arrived. You can also scan a club&rsquo;s
          invitation or a drive&rsquo;s progress code.
        </p>
      </header>
      <QrScan />
    </Container>
  );
}
