import { OnboardingPanel } from "@/components/auth/onboarding-panel";
import { TopNavigation } from "@/components/top-navigation";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export default async function OnboardingPage() {
  await requirePilotPageIdentity("/onboarding");
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <OnboardingPanel />
    </main>
  );
}
