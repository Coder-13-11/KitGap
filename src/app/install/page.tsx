import type { Metadata } from "next";
import { InstallApp } from "@/components/site/install-app";
import { Container, PageHeader } from "@/components/ui/layout-bits";

export const metadata: Metadata = { title: "Get the app" };

export default function InstallPage() {
  return (
    <Container narrow className="space-y-8">
      <PageHeader
        title="Get KitGap on your phone"
        description="KitGap installs from your browser on iPhone and Android. No app store needed, and it updates itself."
      />
      <InstallApp />
    </Container>
  );
}
