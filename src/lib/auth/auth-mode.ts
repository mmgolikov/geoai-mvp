import type { GeoAIAuthMode } from "@/src/types/auth";

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

  return "demo_public";
}

export function hasSupabasePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getEffectiveAuthMode(): GeoAIAuthMode {
  const requestedMode = getRequestedAuthMode();

  if (requestedMode === "supabase_auth" && !hasSupabasePublicConfig()) {
    return "demo_public";
  }

  return requestedMode;
}

export function authModeToLabel(mode: GeoAIAuthMode) {
  if (mode === "supabase_auth") return "Supabase Auth";
  if (mode === "disabled") return "Auth disabled";
  return "Pilot public";
}

export function authModeToCaveat(mode: GeoAIAuthMode, requestedMode = mode) {
  if (requestedMode === "supabase_auth" && mode === "demo_public") {
    return "Supabase Auth was requested but public Supabase configuration is missing; GeoAI is using public demo access.";
  }

  if (mode === "supabase_auth") {
    return "Authentication foundation only; production access control requires configured Supabase Auth, RLS and deployment governance.";
  }

  if (mode === "disabled") {
    return "Authentication UI is disabled; public pilot screening workflows remain available.";
  }

  return "Public pilot access is enabled; official validation and production access control are not configured.";
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
