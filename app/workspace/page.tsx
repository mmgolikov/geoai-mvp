import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";

type WorkspacePageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <TopNavigation />
      <WorkspaceShell initialExploreMode={params?.mode === "explore"} />
    </main>
  );
}
