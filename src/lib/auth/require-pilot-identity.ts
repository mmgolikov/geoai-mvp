import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import { evaluateApiMutationOrigin } from "@/src/lib/auth/api-mutation-origin";
import { isExactProjectKey } from "@/src/lib/auth/request-project-read-policy";
import { getConfiguredPublicOrigin } from "@/src/lib/platform/public-request-origin";
import { pointObjectProductionAuthConfigured } from "@/src/lib/prototype/point-object-runtime-policy";
import type { RequestAuthContext, RequestAuthStatus } from "@/src/lib/auth/request-context";

type ProductionMembershipEnvironment = Readonly<Record<string, string | undefined>>;
type ProductionMembershipAction = "analysis.read" | "analysis.run";
type PointObjectMembershipAuthorizer = (input: {
  request: Request;
  projectKey: unknown;
  action: ProductionMembershipAction;
}) => Promise<
  | { allowed: true }
  | { allowed: false; status: 400 | 401 | 403 | 503; code: string }
>;

export type ProductionPointObjectMembershipResult =
  | { required: false; allowed: true }
  | { required: true; allowed: true }
  | { required: true; allowed: false; status: 401 | 403 | 503; code: string };

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

function explicitlyEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

/** Preview takes precedence because Vercel builds run with NODE_ENV=production. */
export function productionPointObjectMembershipRequired(
  environment: ProductionMembershipEnvironment = process.env
) {
  const vercelEnvironment = environment.VERCEL_ENV?.trim();
  const runtimeTarget = environment.GEOAI_RUNTIME_TARGET?.trim();
  const productionRuntime = vercelEnvironment === "production" || (
    !vercelEnvironment &&
    runtimeTarget !== "self_hosted_candidate" &&
    environment.NODE_ENV?.trim() === "production"
  );
  return productionRuntime && (
    explicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE) ||
    explicitlyEnabled(environment.GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE)
  );
}

function membershipDependencyUnavailable(): ProductionPointObjectMembershipResult {
  return {
    required: true,
    allowed: false,
    status: 503,
    code: "project_membership_dependency_unavailable"
  };
}

export async function authorizeProductionPointObjectMembership(input: {
  request: Request;
  action: ProductionMembershipAction;
  environment?: ProductionMembershipEnvironment;
  authorize?: PointObjectMembershipAuthorizer;
}): Promise<ProductionPointObjectMembershipResult> {
  const environment = input.environment ?? process.env;
  if (!productionPointObjectMembershipRequired(environment)) return { required: false, allowed: true };
  if (!pointObjectProductionAuthConfigured(environment)) return membershipDependencyUnavailable();

  const projectKey = environment.GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY;
  if (!isExactProjectKey(projectKey)) return membershipDependencyUnavailable();

  try {
    const authorize = input.authorize ??
      (await import("@/src/lib/prototype/point-object-analysis-runs")).authorizePointObjectAnalysis;
    const access = await authorize({ request: input.request, projectKey, action: input.action });
    if (access.allowed) return { required: true, allowed: true };
    if (access.status === 503) return membershipDependencyUnavailable();
    return {
      required: true,
      allowed: false,
      status: access.status === 401 ? 401 : 403,
      code: access.code
    };
  } catch {
    return membershipDependencyUnavailable();
  }
}

export class ProductionPointObjectMembershipUnavailableError extends Error {
  readonly status = 503;
  readonly code = "project_membership_dependency_unavailable";

  constructor() {
    super("Production project membership could not be verified.");
    this.name = "ProductionPointObjectMembershipUnavailableError";
  }
}

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
    const membership = await authorizeProductionPointObjectMembership({
      request,
      action: request.method === "GET" || request.method === "HEAD" ? "analysis.read" : "analysis.run"
    });
    if (!membership.allowed) {
      return denied(context, membership.status, membership.code);
    }
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
    forwardedProto: request.headers.get("x-forwarded-proto"),
    canonicalPublicOrigin: getConfiguredPublicOrigin()
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
