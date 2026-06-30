import type { Metadata } from "next";
import { ExploreShell } from "@/components/explore/explore-shell";
import { TopNavigation } from "@/components/top-navigation";

export const metadata: Metadata = {
  title: "GeoAI Explore",
  description: "Scenario-first spatial decision intelligence for Dubai."
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <ExploreShell />
    </main>
  );
}
