import { AdminPanel } from "@/components/auth/admin-panel";
import { TopNavigation } from "@/components/top-navigation";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export default async function AdminPage() {
  await requirePilotPageIdentity("/admin");
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <AdminPanel />
    </main>
  );
}
