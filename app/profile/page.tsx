import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { ProfilePanel } from "@/components/auth/profile-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function ProfilePage() {
  return (
    <AuthenticatedRouteGate>
      <main className="min-h-screen bg-surface">
        <TopNavigation />
        <ProfilePanel />
      </main>
    </AuthenticatedRouteGate>
  );
}
