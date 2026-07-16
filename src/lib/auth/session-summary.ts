import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { createDemoProjectMembership, demoOrganization, demoProjectRole, demoUser } from "@/src/lib/auth/demo-session";
import { createRequestAuthContext } from "@/src/lib/auth/request-context";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";

export async function getSafeAuthSessionSummary(request: Request) {
  const authStatus = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const hardAccessEnabled = authStatus.effectiveMode === "supabase_auth" && enforcement.accessEnforcementMode === "hard";
  const base = {
    ok: true,
    authMode: authStatus.effectiveMode,
    requestedAuthMode: authStatus.requestedMode,
    label: authStatus.label,
    hardAccessEnabled,
    requestedHardAccessEnabled: enforcement.accessEnforcementMode === "hard",
    accessEnforcementMode: enforcement.accessEnforcementMode,
    allowDemoPublic: enforcement.allowDemoPublic,
    caveat: authStatus.caveat,
    generatedAt: new Date().toISOString()
  };

  if (authStatus.effectiveMode === "demo_public") {
    return {
      ...base,
      isDemo: true,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "demo_public",
      requestId: null,
      user: demoUser,
      supabaseUser: null,
      profile: null,
      organization: demoOrganization,
      projectRole: demoProjectRole,
      membership: createDemoProjectMembership(),
      warnings: ["Public demo access is not a Supabase-authenticated session."]
    };
  }

  if (authStatus.effectiveMode !== "supabase_auth") {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: "auth_disabled_fail_closed",
      requestId: null,
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["Authentication is disabled; no demo identity was synthesized."]
    };
  }

  const context = await createRequestAuthContext(request);
  if (!context.verified || !context.user || !context.profile) {
    return {
      ...base,
      isDemo: false,
      isAuthenticated: false,
      supabaseAuthenticated: false,
      sessionStatus: context.status,
      requestId: context.requestId,
      user: null,
      supabaseUser: null,
      profile: null,
      organization: null,
      projectRole: null,
      membership: null,
      warnings: ["Supabase SSR cookie identity did not pass claims, user and active-profile verification."]
    };
  }

  const user = context.user;
  const profile = context.profile;
  const assurance = context.supabase
    ? await context.supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : null;
  const mfa = assurance && !assurance.error
    ? {
        currentLevel: assurance.data.currentLevel,
        nextLevel: assurance.data.nextLevel,
        requiresChallenge: assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2"
      }
    : {
        currentLevel: null,
        nextLevel: null,
        requiresChallenge: false
      };

  return {
    ...base,
    isDemo: false,
    isAuthenticated: true,
    supabaseAuthenticated: true,
    sessionStatus: "supabase_user_with_profile",
    requestId: context.requestId,
    user: {
      id: user.id,
      email: user.email ?? profile.email,
      name: profile.fullName ?? user.email ?? "Supabase Auth user",
      isDemoUser: false
    },
    supabaseUser: {
      id: user.id,
      email: user.email ?? null
    },
    profile,
    mfa,
    organization: null,
    projectRole: null,
    membership: null,
    warnings: ["Identity is verified; project membership authorization remains disabled until AUTH-01C persona evidence passes."]
  };
}
