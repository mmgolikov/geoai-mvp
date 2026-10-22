import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { DevkitConnectedWorkspace } from "@/components/devkit/module-slots";
import { TopNavigation } from "@/components/top-navigation";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export default async function DevelopmentKitPage() {
  await requirePilotPageIdentity("/projects/development-kit");
  return (
    <AuthenticatedRouteGate>
      <div className="min-h-screen bg-surface">
        <TopNavigation />
        <DevkitConnectedWorkspace />
      </div>
    </AuthenticatedRouteGate>
  );
}
