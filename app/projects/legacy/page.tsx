import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { ProjectDashboard } from "@/components/project-dashboard/project-dashboard";
import { TopNavigation } from "@/components/top-navigation";

// Compatibility only: preserve access to earlier browser-local work without
// importing its shared demo namespace into the identity-scoped Project Hub.
export default function LegacyProjectsPage() {
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        <ProjectDashboard />
      </div>
    </AuthenticatedRouteGate>
  );
}
