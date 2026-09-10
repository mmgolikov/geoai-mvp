import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { PointObjectProjectsPageClient } from "@/components/point-to-object/projects-page-client";
import { TopNavigation } from "@/components/top-navigation";

export default function ProjectsPage() {
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        <PointObjectProjectsPageClient />
      </div>
    </AuthenticatedRouteGate>
  );
}
