import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { PointObjectProjectsPageClient } from "@/components/point-to-object/projects-page-client";
import { TopNavigation } from "@/components/top-navigation";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export default async function ProjectsPage() {
  await requirePilotPageIdentity("/projects");
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        <PointObjectProjectsPageClient />
      </div>
    </AuthenticatedRouteGate>
  );
}
