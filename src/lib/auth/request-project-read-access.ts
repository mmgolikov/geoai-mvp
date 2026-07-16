import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";
import { createRequestAuthContext } from "@/src/lib/auth/request-context";
import {
  evaluateCurrentProjectReadAccess,
  evaluateRequestProjectReadPrerequisites,
  type CurrentProjectAccessRow,
  type RequestProjectReadAction,
  type RequestProjectReadAllowance,
  type RequestProjectReadDenial,
  type RequestProjectReadReadiness
} from "@/src/lib/auth/request-project-read-policy";
import { requestScopedSupabaseRepositoriesEnabled } from "@/src/lib/supabase/config";

export type AuthorizedRequestProjectRead = RequestProjectReadAllowance & {
  requestId: string;
  supabase: SupabaseClient;
};

export type RequestProjectReadAccessResult =
  | RequestProjectReadDenial
  | AuthorizedRequestProjectRead;

function currentReadiness(): RequestProjectReadReadiness {
  return {
    repositoriesEnabled: requestScopedSupabaseRepositoriesEnabled,
    authKernelImplemented: requestAuthKernelStatus.implemented,
    requestUserVerified: requestAuthKernelStatus.requestUserVerified,
    projectMembershipVerified: requestAuthKernelStatus.projectMembershipVerified,
    rlsPersonaMatrixVerified: requestAuthKernelStatus.rlsPersonaMatrixVerified
  };
}

function requestContextDenial(status: string): RequestProjectReadDenial {
  if (status === "dependency_unavailable" || status === "public_config_missing") {
    return {
      allowed: false,
      code: "dependency_unavailable",
      httpStatus: 503,
      reason: "The caller-scoped Auth dependency is unavailable."
    };
  }
  if (status === "unsupported_bearer_transport") {
    return {
      allowed: false,
      code: "unsupported_bearer_transport",
      httpStatus: 401,
      reason: "Bearer and mixed credential transports are not supported."
    };
  }
  return {
    allowed: false,
    code: "request_identity_unverified",
    httpStatus: status === "claims_unverified" || status === "user_unverified" ? 401 : 403,
    reason: "The request does not have a verified active caller profile."
  };
}

export async function authorizeRequestScopedProjectRead(input: {
  request: Request;
  projectKey: unknown;
  action: RequestProjectReadAction;
}): Promise<RequestProjectReadAccessResult> {
  const authMode = getAuthModeStatus();
  const prerequisiteDenial = evaluateRequestProjectReadPrerequisites({
    projectKey: input.projectKey,
    action: input.action,
    authMode: authMode.effectiveMode,
    authorizationHeaderPresent: input.request.headers.has("authorization"),
    readiness: currentReadiness()
  });
  if (prerequisiteDenial) return prerequisiteDenial;

  const projectKey = input.projectKey as string;
  const context = await createRequestAuthContext(input.request);
  if (!context.verified || !context.supabase || !context.user || !context.profile) {
    return requestContextDenial(context.status);
  }

  try {
    const response = await context.supabase
      .schema("api")
      .rpc("current_project_access", { target_project_key: projectKey })
      .maybeSingle<CurrentProjectAccessRow>();

    if (response.error) {
      return {
        allowed: false,
        code: "dependency_unavailable",
        httpStatus: 503,
        reason: "The caller-scoped project access projection is unavailable."
      };
    }

    const policy = evaluateCurrentProjectReadAccess({
      projectKey,
      action: input.action,
      principal: {
        userId: context.user.id,
        profileId: context.profile.id,
        authUserId: context.profile.authUserId
      },
      row: response.data
    });

    if (!policy.allowed) return policy;
    return {
      ...policy,
      requestId: context.requestId,
      supabase: context.supabase
    };
  } catch {
    return {
      allowed: false,
      code: "dependency_unavailable",
      httpStatus: 503,
      reason: "The caller-scoped project access projection is unavailable."
    };
  }
}
