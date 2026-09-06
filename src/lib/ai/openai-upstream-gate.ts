import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";
import { getEnforcementConfig, getProjectAccessEnforcementMode } from "@/src/lib/platform/enforcement-config";
import { resolvePointObjectRuntimePolicy } from "@/src/lib/prototype/point-object-runtime-policy";

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

function getPointObjectRuntimePolicy() {
  const general = getOpenAiUpstreamStatus();
  const keyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const policy = resolvePointObjectRuntimePolicy(process.env, {
    openAiKeyConfigured: keyConfigured,
    generalUpstreamEnabled: general.enabled
  });

  return { general, policy };
}

/** Narrow point-to-object exception; it never enables general product AI routes. */
export function getPointObjectUpstreamStatus() {
  const { general, policy } = getPointObjectRuntimePolicy();
  const enabled = policy.ai.enabled;

  return {
    enabled,
    mode: enabled ? "openai_enabled" as const : "deterministic_fallback" as const,
    environment: policy.environment,
    reason: policy.ai.reason,
    scope: policy.ai.scope,
    caveat: enabled
      ? policy.ai.scope === "general_governed_upstream"
        ? general.caveat
        : `OpenAI upstream is enabled only for the isolated point-to-object ${policy.environment} runtime by its dedicated operator flag.`
      : "Point-to-object upstream is disabled unless its exact environment policy, server-only key and dedicated operator flag are active."
  };
}

/**
 * Surface gate for read-only open-map requests. Unlike the OpenAI
 * upstream gate, this deliberately does not depend on an OpenAI credential:
 * geocoding and OSM/Overpass context must remain independently testable.
 */
export function getPointObjectSurfaceStatus() {
  const { policy } = getPointObjectRuntimePolicy();
  const enabled = policy.surface.enabled;

  return {
    enabled,
    environment: policy.environment,
    reason: policy.surface.reason,
    mode: enabled ? "point_object_surface_enabled" as const : "point_object_surface_disabled" as const,
    caveat: enabled
      ? `Read-only point-to-object sources are enabled for the explicitly allowed ${policy.environment} surface.`
      : "Read-only point-to-object sources are disabled outside an explicitly allowed runtime surface."
  };
}

/**
 * Compatibility gate for the read-only source routes. Those routes remain
 * Preview-only until their independent Production surface authorization lands.
 */
export function getPointObjectPreviewSurfaceStatus() {
  const surface = getPointObjectSurfaceStatus();
  const enabled = surface.environment === "preview" && surface.enabled;

  return {
    enabled,
    mode: enabled ? "preview_surface_enabled" as const : "preview_surface_disabled" as const,
    caveat: enabled
      ? "Read-only point-to-object Preview sources are enabled by the isolated Preview operator flag."
      : "Read-only point-to-object sources are disabled outside the explicitly enabled Preview surface."
  };
}
