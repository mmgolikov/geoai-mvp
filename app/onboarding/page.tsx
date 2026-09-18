import { OnboardingPanel } from "@/components/auth/onboarding-panel";
import { TopNavigation } from "@/components/top-navigation";
import { cookies } from "next/headers";
import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import { onboardingInvitationCookieName } from "@/src/lib/auth/invitation-cookie.server";
import { isInvitationToken } from "@/src/lib/auth/invitation-token.server";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  // Presentation hint only: the opaque token never crosses the RSC boundary.
  // Acceptance still validates the actual cookie against the caller on the server.
  const initialInvitationStaged = getEffectiveAuthMode() === "supabase_auth" &&
    isInvitationToken(cookieStore.get(onboardingInvitationCookieName)?.value ?? "");
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <OnboardingPanel initialInvitationStaged={initialInvitationStaged} />
    </main>
  );
}
