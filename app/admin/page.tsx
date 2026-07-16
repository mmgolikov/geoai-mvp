import { AdminPanel } from "@/components/auth/admin-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <AdminPanel />
    </main>
  );
}
