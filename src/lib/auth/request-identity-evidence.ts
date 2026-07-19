export type RequestIdentityEvidenceStatus =
  | "verified"
  | "claims_unverified"
  | "user_unverified"
  | "claims_user_mismatch"
  | "anonymous_identity"
  | "identity_malformed";

export type RequestIdentityEvidence =
  | {
      verified: true;
      status: "verified";
      userId: string;
    }
  | {
      verified: false;
      status: Exclude<RequestIdentityEvidenceStatus, "verified">;
      userId: null;
    };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function denied(status: Exclude<RequestIdentityEvidenceStatus, "verified">): RequestIdentityEvidence {
  return { verified: false, status, userId: null };
}

/**
 * Pure fail-closed boundary between Supabase identity proof and GeoAI RBAC.
 *
 * Anonymous Supabase users receive the authenticated Postgres role, so a
 * subject match alone is not sufficient identity evidence. Both the verified
 * JWT claims and the canonical Auth user must explicitly identify a permanent
 * user before profile or membership resolution is allowed.
 */
export function evaluateRequestIdentityEvidence(input: {
  claims: {
    sub?: unknown;
    isAnonymous?: unknown;
  } | null;
  user: {
    id?: unknown;
    isAnonymous?: unknown;
  } | null;
}): RequestIdentityEvidence {
  const subject = input.claims?.sub;
  if (typeof subject !== "string" || subject.length === 0) {
    return denied("claims_unverified");
  }

  const userId = input.user?.id;
  if (typeof userId !== "string" || userId.length === 0) {
    return denied("user_unverified");
  }

  if (!uuidPattern.test(subject) || !uuidPattern.test(userId)) {
    return denied("identity_malformed");
  }
  if (subject !== userId) {
    return denied("claims_user_mismatch");
  }

  const claimsAnonymous = input.claims?.isAnonymous;
  const userAnonymous = input.user?.isAnonymous;
  if (claimsAnonymous === true || userAnonymous === true) {
    return denied("anonymous_identity");
  }
  if (claimsAnonymous !== false || userAnonymous !== false) {
    // Missing, stringified or otherwise ambiguous anonymous markers must not
    // be treated as permanent-user evidence.
    return denied("identity_malformed");
  }

  return { verified: true, status: "verified", userId };
}
