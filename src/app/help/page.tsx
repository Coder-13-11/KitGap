import { Container,PageHeader } from "@/components/ui/layout-bits";
import { GuestManager } from "@/components/drives/guest-manager";
export const metadata={title:"My private pledge",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default function GuestHelpPage(){return <Container narrow className="space-y-6"><PageHeader title="My pledge" description="A small promise, kept simple." /><GuestManager /></Container>;}

