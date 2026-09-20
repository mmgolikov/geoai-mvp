import { redirect } from "next/navigation";

import { getEffectiveAuthMode, getRequestedAuthMode } from "@/src/lib/auth/auth-mode";
import { createRequestAuthContext } from "@/src/lib/auth/request-context";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import {
  authorizeProductionPointObjectMembership,
  ProductionPointObjectMembershipUnavailableError
} from "@/src/lib/auth/require-pilot-identity";

/**
 * Server-rendered page guard. API authorization remains authoritative; this
 * redirect only prevents protected product markup from reaching a guest.
 */
export async function requirePilotPageIdentity(nextPath: string): Promise<void> {
  const mode = getEffectiveAuthMode();
  if (mode === "supabase_auth") {
    const membership = await authorizeProductionPointObjectMembership({
      request: new Request("https://geoai.invalid/production-page-membership"),
      action: "analysis.read"
    });

    if (membership.required) {
      if (membership.allowed) return;
      if (membership.status === 503) throw new ProductionPointObjectMembershipUnavailableError();
      if (membership.status === 401 || membership.code === "request_identity_unverified") {
        const next = getSafeAuthRedirectPath(nextPath);
        redirect(`/login?${new URLSearchParams({ next }).toString()}`);
      }
      redirect("/request-access");
    }
  }

  const context = await createRequestAuthContext();

  if (mode === "demo_public" && context.status === "auth_mode_disabled") return;
  if (mode === "supabase_auth" && context.verified) return;

  const next = getSafeAuthRedirectPath(nextPath);
  const params = new URLSearchParams({ next });
  if (getRequestedAuthMode() === "supabase_auth" && mode !== "supabase_auth") {
    params.set("auth_error", "configuration_unavailable");
  } else if (context.status === "dependency_unavailable" || context.status === "public_config_missing") {
    params.set("auth_error", "dependency_unavailable");
  }
  redirect(`/login?${params.toString()}`);
}
