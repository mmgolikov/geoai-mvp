import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { ProjectDashboard } from "@/components/project-dashboard/project-dashboard";
import { TopNavigation } from "@/components/top-navigation";

export default function ProjectsPage() {
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        <ProjectDashboard />
      </div>
    </AuthenticatedRouteGate>
  );
}
