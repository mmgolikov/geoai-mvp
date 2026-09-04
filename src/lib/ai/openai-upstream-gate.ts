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

/**
 * Narrow exception for the isolated point-to-object evaluator. It remains
 * Preview-only and requires an explicit, separately auditable operator flag;
 * it never enables the general product AI routes or Production.
 */
export function getPointObjectPreviewUpstreamStatus() {
  const general = getOpenAiUpstreamStatus();
  const keyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const previewOnly = process.env.VERCEL_ENV === "preview";
  const explicitlyAllowed =
    process.env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI?.trim().toLowerCase() === "true";
  const isolatedPreviewEnabled = keyConfigured && previewOnly && explicitlyAllowed;
  const enabled = general.enabled || isolatedPreviewEnabled;

  return {
    enabled,
    mode: enabled ? "openai_enabled" as const : "deterministic_fallback" as const,
    scope: general.enabled ? "general_governed_upstream" as const : "isolated_point_object_preview" as const,
    caveat: enabled
      ? general.enabled
        ? general.caveat
        : "OpenAI upstream is enabled only for the isolated point-to-object Preview route by its dedicated operator flag."
      : "Point-to-object upstream is disabled unless the general governed gate or its dedicated Preview-only operator flag is active."
  };
}

/**
 * Preview surface gate for read-only open-map requests. Unlike the OpenAI
 * upstream gate, this deliberately does not depend on an OpenAI credential:
 * geocoding and OSM/Overpass context must remain independently testable.
 */
export function getPointObjectPreviewSurfaceStatus() {
  const previewOnly = process.env.VERCEL_ENV === "preview";
  const explicitlyAllowed =
    process.env.GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI?.trim().toLowerCase() === "true";
  const enabled = previewOnly && explicitlyAllowed;

  return {
    enabled,
    mode: enabled ? "preview_surface_enabled" as const : "preview_surface_disabled" as const,
    caveat: enabled
      ? "Read-only point-to-object Preview sources are enabled by the isolated Preview operator flag."
      : "Read-only point-to-object sources are disabled outside the explicitly enabled Preview surface."
  };
}
