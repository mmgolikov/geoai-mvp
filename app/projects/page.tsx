import { ProjectDashboard } from "@/components/project-dashboard/project-dashboard";
import { TopNavigation } from "@/components/top-navigation";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNavigation />
      <ProjectDashboard />
    </div>
  );
}
