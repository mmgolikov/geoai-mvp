import type { Metadata } from "next";
import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createSpatialSourceRequest } from "@/src/lib/spatial-b2/source-mode";

export const metadata: Metadata = {
  title: "GeoAI Workspace",
  description: "Scenario-first spatial decision intelligence workspace."
};

type ExplorePageProps = {
  searchParams?: Promise<{
    spatialMode?: string;
  }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const spatialSourceRequest = createSpatialSourceRequest({
    requestedSourceMode: params?.spatialMode,
    vercelEnvironment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV
  });

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <TopNavigation />
      <WorkspaceShell initialExploreMode spatialSourceRequest={spatialSourceRequest} />
    </main>
  );
}
