import type { GeoAIAuthMode } from "@/src/types/auth";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";

export type AuthModeStatus = {
  requestedMode: GeoAIAuthMode;
  effectiveMode: GeoAIAuthMode;
  label: string;
  caveat: string;
  supabasePublicConfigAvailable: boolean;
};

const AUTH_MODE_VALUES: GeoAIAuthMode[] = ["demo_public", "supabase_auth", "disabled"];

export function getRequestedAuthMode(): GeoAIAuthMode {
  const raw = process.env.NEXT_PUBLIC_AUTH_MODE?.trim() as GeoAIAuthMode | undefined;

  if (raw && AUTH_MODE_VALUES.includes(raw)) {
    return raw;
  }

  return raw ? "disabled" : "demo_public";
}

export function hasSupabasePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getEffectiveAuthMode(): GeoAIAuthMode {
  const requestedMode = getRequestedAuthMode();

  if (requestedMode === "supabase_auth" && (!hasSupabasePublicConfig() || !requestAuthKernelStatus.implemented)) {
    return "disabled";
  }

  return requestedMode;
}

export function authModeToLabel(mode: GeoAIAuthMode) {
  if (mode === "supabase_auth") return "Supabase Auth";
  if (mode === "disabled") return "Auth disabled";
  return "Public demo";
}

export function authModeToCaveat(mode: GeoAIAuthMode, requestedMode = mode) {
  if (requestedMode === "supabase_auth" && mode === "disabled") {
    return hasSupabasePublicConfig()
      ? `${requestAuthKernelStatus.reason} Access fails closed instead of synthesizing a profile, organization or membership.`
      : "Supabase Auth was requested but public configuration is incomplete; access fails closed instead of falling back to a demo identity.";
  }

  if (mode === "supabase_auth") {
    return "Authentication foundation only; production access control requires configured Supabase Auth, RLS and deployment governance.";
  }

  if (mode === "disabled") {
    return "Authentication is disabled; no demo identity is synthesized. Select demo_public explicitly for public screening access.";
  }

  return "Public demo access is enabled; official validation and production access control are not configured.";
}

export function getAuthModeStatus(): AuthModeStatus {
  const requestedMode = getRequestedAuthMode();
  const effectiveMode = getEffectiveAuthMode();

  return {
    requestedMode,
    effectiveMode,
    label: authModeToLabel(effectiveMode),
    caveat: authModeToCaveat(effectiveMode, requestedMode),
    supabasePublicConfigAvailable: hasSupabasePublicConfig()
  };
}

export function isAuthRequired() {
  return getEffectiveAuthMode() === "supabase_auth";
}
