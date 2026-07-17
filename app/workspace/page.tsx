import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createSpatialSourceRequest } from "@/src/lib/spatial-b2/source-mode";

type WorkspacePageProps = {
  searchParams?: Promise<{
    mode?: string;
    spatialMode?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;
  const spatialSourceRequest = createSpatialSourceRequest({
    requestedSourceMode: params?.spatialMode,
    vercelEnvironment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV
  });

  return (
    <AuthenticatedRouteGate>
      <main className="flex min-h-screen flex-col bg-surface">
        <TopNavigation />
        <WorkspaceShell
          initialExploreMode={params?.mode === "explore"}
          spatialSourceRequest={spatialSourceRequest}
        />
      </main>
    </AuthenticatedRouteGate>
  );
}
