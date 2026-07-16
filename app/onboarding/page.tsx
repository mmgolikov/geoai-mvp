import { OnboardingPanel } from "@/components/auth/onboarding-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <OnboardingPanel />
    </main>
  );
}
