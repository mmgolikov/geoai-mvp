import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import { evaluateApiMutationOrigin } from "@/src/lib/auth/api-mutation-origin";
import type { RequestAuthContext, RequestAuthStatus } from "@/src/lib/auth/request-context";

type PilotIdentityAllowed = {
  allowed: true;
  mode: "demo_public" | "supabase_auth";
  context: RequestAuthContext | null;
};

type PilotIdentityDenied = {
  allowed: false;
  response: Response;
};

export type PilotIdentityDecision = PilotIdentityAllowed | PilotIdentityDenied;

const invalidSessionStatuses = new Set<RequestAuthStatus>([
  "claims_unverified",
  "user_unverified",
  "claims_user_mismatch",
  "unsupported_bearer_transport"
]);

const forbiddenIdentityStatuses = new Set<RequestAuthStatus>([
  "anonymous_identity",
  "identity_malformed",
  "profile_missing",
  "profile_inactive"
]);

function denied(context: RequestAuthContext, status: 401 | 403 | 503, code: string): PilotIdentityDenied {
  return {
    allowed: false,
    response: Response.json(
      {
        ok: false,
        code,
        requestId: context.requestId
      },
      {
        status,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Vary: "Authorization, Cookie"
        }
      }
    )
  };
}

/**
 * Identity boundary for the authenticated rehearsal.
 *
 * Public-demo behavior remains unchanged. When Supabase Auth is selected, a
 * request must carry a verified cookie session and an active permanent-user
 * profile before any body parsing, quota consumption or upstream execution.
 */
export async function requirePilotIdentity(request: Request): Promise<PilotIdentityDecision> {
  const mode = getEffectiveAuthMode();
  if (mode === "demo_public") return { allowed: true, mode, context: null };

  const { createRequestAuthContext } = await import("@/src/lib/auth/request-context");
  const context = await createRequestAuthContext(request);
  if (mode === "supabase_auth" && context.verified) {
    return { allowed: true, mode, context };
  }
  if (invalidSessionStatuses.has(context.status)) {
    return denied(context, 401, "authentication_required");
  }
  if (forbiddenIdentityStatuses.has(context.status)) {
    return denied(context, 403, "identity_not_authorized");
  }
  return denied(context, 503, "authentication_dependency_unavailable");
}

export function requirePilotMutationOrigin(request: Request) {
  // Public-demo handlers retain their established per-route origin checks.
  // The shared stricter decision is part of the cookie-authenticated rehearsal.
  if (getEffectiveAuthMode() === "demo_public") return null;
  const requestUrl = new URL(request.url);
  const decision = evaluateApiMutationOrigin({
    method: request.method,
    pathname: requestUrl.pathname,
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto")
  });
  return decision.allowed
    ? null
    : Response.json(
        { ok: false, code: "request_origin_rejected" },
        {
          status: 403,
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
            Vary: "Authorization, Cookie, Origin, Sec-Fetch-Site"
          }
        }
      );
}
