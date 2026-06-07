import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function WorkspacePage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <TopNavigation />
      <WorkspaceShell />
    </main>
  );
}
