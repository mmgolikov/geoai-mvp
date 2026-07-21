import type { Metadata } from "next";
import { RequestAccessPanel } from "@/components/request-access-panel";
import { TopNavigation } from "@/components/top-navigation";

export const metadata: Metadata = {
  title: "Prepare a request brief | GeoAI",
  description: "Prepare a local GeoAI access request brief without transmitting or storing contact data."
};

export default function RequestAccessPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-surface">
      <TopNavigation />
      <RequestAccessPanel />
    </main>
  );
}
