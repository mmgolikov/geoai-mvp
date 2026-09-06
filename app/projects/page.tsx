import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { PointObjectProjectsPageClient } from "@/components/point-to-object/projects-page-client";
import { ProjectDashboard } from "@/components/project-dashboard/project-dashboard";
import { TopNavigation } from "@/components/top-navigation";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view;
  const spatial = view === "spatial";
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        {spatial ? <PointObjectProjectsPageClient /> : <ProjectDashboard />}
      </div>
    </AuthenticatedRouteGate>
  );
}
