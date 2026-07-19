import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";
import { getEnforcementConfig, getProjectAccessEnforcementMode } from "@/src/lib/platform/enforcement-config";

export function getOpenAiUpstreamStatus() {
  const keyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const explicitlyAllowed = process.env.GEOAI_ALLOW_OPENAI_UPSTREAM?.trim().toLowerCase() === "true";
  const hardAccessRequested = getProjectAccessEnforcementMode() === "hard";
  const supabaseAuthRequested = getAuthModeStatus().effectiveMode === "supabase_auth";
  const requestIdentityKernelVerified = requestAuthKernelStatus.implemented &&
    requestAuthKernelStatus.requestUserVerified && requestAuthKernelStatus.projectMembershipVerified;
  const publicDemoDisabled = !getEnforcementConfig().allowDemoPublic;
  const enabled = keyConfigured && explicitlyAllowed && hardAccessRequested && supabaseAuthRequested &&
    requestIdentityKernelVerified && publicDemoDisabled;

  return {
    enabled,
    mode: enabled ? "openai_enabled" as const : "deterministic_fallback" as const,
    caveat: enabled
      ? "OpenAI upstream is enabled behind verified request identity/membership, hard Supabase Auth and a disabled public-demo bypass; the current request must still pass generate access."
      : "OpenAI upstream is disabled unless the operator gate, verified request identity/membership, hard Supabase Auth and disabled public-demo bypass are all active."
  };
}
