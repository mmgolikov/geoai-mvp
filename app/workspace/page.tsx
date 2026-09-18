import type { Metadata } from "next";
import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";
import {
  createSpatialSourceRequest,
  spatialProductSourceModes
} from "@/src/lib/spatial-b2/source-mode";

export const metadata: Metadata = {
  title: "GeoAI Workspace",
  description: "Map-first and criteria-first spatial decision intelligence workspace."
};

type WorkspacePageProps = {
  searchParams?: Promise<{
    segment?: string | string[];
    spatialMode?: string | string[];
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;
  const segment = params?.segment === "b2b" || params?.segment === "b2c" ? params.segment : null;
  const spatialMode = typeof params?.spatialMode === "string" && spatialProductSourceModes.includes(params.spatialMode as (typeof spatialProductSourceModes)[number])
    ? params.spatialMode
    : null;
  const continuation = new URLSearchParams();
  if (segment) continuation.set("segment", segment);
  if (spatialMode) continuation.set("spatialMode", spatialMode);
  const nextPath = continuation.size > 0 ? `/workspace?${continuation.toString()}` : "/workspace";
  await requirePilotPageIdentity(nextPath);
  const spatialSourceRequest = createSpatialSourceRequest({
    requestedSourceMode: spatialMode,
    vercelEnvironment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV
  });

  return (
    <AuthenticatedRouteGate>
      <main className="flex min-h-screen flex-col bg-surface">
        <TopNavigation />
        <WorkspaceShell spatialSourceRequest={spatialSourceRequest} />
      </main>
    </AuthenticatedRouteGate>
  );
}
