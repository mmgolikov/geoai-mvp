import type { RequestAuthStatus } from "@/src/lib/auth/request-context";

const supabaseAuthCookieName = /^sb-[A-Za-z0-9-]+-auth-token(?:[.][0-9]+)?$/;

export type PublicSessionStatus = RequestAuthStatus | "session_missing";

export function hasSupabaseAuthCookie(cookieHeader: string | null) {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((entry) => {
    const separator = entry.indexOf("=");
    const name = (separator >= 0 ? entry.slice(0, separator) : entry).trim();
    return supabaseAuthCookieName.test(name);
  });
}

export function getPublicSessionStatus(
  contextStatus: RequestAuthStatus,
  cookieHeader: string | null
): PublicSessionStatus {
  // A missing Supabase SSR cookie plus unverified claims is the only negative
  // state that proves this browser has no server session. Invalid cookies,
  // profile/RPC failures and dependency failures remain unresolved.
  return contextStatus === "claims_unverified" && !hasSupabaseAuthCookie(cookieHeader)
    ? "session_missing"
    : contextStatus;
}
