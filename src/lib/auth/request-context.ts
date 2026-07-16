import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  evaluateRequestIdentityEvidence,
  type RequestIdentityEvidenceStatus
} from "@/src/lib/auth/request-identity-evidence";
import { createRequestScopedSupabaseClient } from "@/src/lib/supabase/ssr-server";

export type RequestAuthStatus =
  | "verified"
  | "public_config_missing"
  | "unsupported_bearer_transport"
  | Exclude<RequestIdentityEvidenceStatus, "verified">
  | "profile_missing"
  | "profile_inactive"
  | "dependency_unavailable";

export type RequestProfile = {
  id: string;
  authUserId: string;
  email: string | null;
  fullName: string | null;
  status: "active";
  identityKind: "user";
};

export type RequestAuthContext = {
  requestId: string;
  status: RequestAuthStatus;
  verified: boolean;
  supabase: SupabaseClient | null;
  user: User | null;
  profile: RequestProfile | null;
};

type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string | null;
  full_name: string | null;
  status: string;
  identity_kind: string;
};

function result(
  requestId: string,
  status: RequestAuthStatus,
  supabase: SupabaseClient | null,
  user: User | null = null,
  profile: RequestProfile | null = null
): RequestAuthContext {
  return {
    requestId,
    status,
    verified: status === "verified",
    supabase,
    user,
    profile
  };
}

export async function createRequestAuthContext(request?: Request): Promise<RequestAuthContext> {
  const requestId = crypto.randomUUID();

  // AUTH-01A intentionally supports the SSR cookie transport only. A future
  // bearer API transport must be explicit and must reject mixed credentials.
  if (request?.headers.get("authorization")) {
    return result(requestId, "unsupported_bearer_transport", null);
  }

  const supabase = await createRequestScopedSupabaseClient();
  if (!supabase) return result(requestId, "public_config_missing", null);

  try {
    const claimsResponse = await supabase.auth.getClaims();
    const claims = claimsResponse.data?.claims;
    if (claimsResponse.error || !claims) {
      return result(requestId, "claims_unverified", supabase);
    }

    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    if (userResponse.error || !user) {
      return result(requestId, "user_unverified", supabase);
    }

    const identityEvidence = evaluateRequestIdentityEvidence({
      claims: {
        sub: claims.sub,
        isAnonymous: claims.is_anonymous
      },
      user: {
        id: user.id,
        isAnonymous: user.is_anonymous
      }
    });
    if (!identityEvidence.verified) {
      return result(requestId, identityEvidence.status, supabase);
    }

    const profileResponse = await supabase
      .schema("api")
      .rpc("current_profile")
      .maybeSingle<ProfileRow>();

    if (profileResponse.error) {
      return result(requestId, "dependency_unavailable", supabase, user);
    }
    const profile = profileResponse.data;
    if (!profile?.id || profile.auth_user_id !== identityEvidence.userId) {
      return result(requestId, "profile_missing", supabase, user);
    }
    if (profile.status !== "active" || profile.identity_kind !== "user") {
      return result(requestId, "profile_inactive", supabase, user);
    }

    return result(requestId, "verified", supabase, user, {
      id: profile.id,
      authUserId: profile.auth_user_id,
      email: profile.email,
      fullName: profile.full_name,
      status: "active",
      identityKind: "user"
    });
  } catch {
    return result(requestId, "dependency_unavailable", supabase);
  }
}
