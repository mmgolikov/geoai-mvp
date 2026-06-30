import type { Metadata } from "next";
import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";

export const metadata: Metadata = {
  title: "GeoAI Explore",
  description: "Scenario-first spatial decision intelligence for Dubai."
};

export default function ExplorePage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <TopNavigation />
      <WorkspaceShell initialExploreMode />
    </main>
  );
}
