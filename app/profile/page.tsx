import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { ProfilePanel } from "@/components/auth/profile-panel";
import { PointObjectHeader } from "@/components/point-to-object/prototype-header";

export default function ProfilePage() {
  return (
    <>
      <PointObjectHeader backToMap />
      <AuthenticatedRouteGate>
        <main className="min-h-[calc(100vh-64px)] bg-[#f4f8f7]" data-product-shell>
          <ProfilePanel />
        </main>
      </AuthenticatedRouteGate>
    </>
  );
}
